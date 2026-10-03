"""
Predictor interface and implementations for SmartCache.

Provides:
    • PredictorInterface — abstract base
    • HeuristicPredictor — rule-based fallback (no ML dependency)
    • MLPredictor        — scikit-learn HistGradientBoosting wrapper
"""
import os
import logging
from abc import ABC, abstractmethod
from typing import List

import numpy as np

logger = logging.getLogger(__name__)


class PredictorInterface(ABC):
    """Common interface for reuse-probability predictors."""

    @abstractmethod
    def predict_reuse_probability(self, features: List[List[float]]) -> np.ndarray:
        """Return an array of reuse probabilities (0..1) for each row.

        Higher probability ⇒ the key is more likely to be accessed
        soon ⇒ should NOT be evicted.
        """
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...


class HeuristicPredictor(PredictorInterface):
    """Rule-based predictor using a weighted combination of features.

    Acts as the always-available fallback when no trained ML model
    is present.  Uses the same feature vector layout as FeatureExtractor:

        [recency, frequency, global_freq, ia_mean, ia_var,
         reuse_distance, recent_window_freq, cache_age,
         frequency_trend, access_density]
    """

    @property
    def name(self) -> str:
        return "HeuristicPredictor"

    def predict_reuse_probability(self, features: List[List[float]]) -> np.ndarray:
        if not features:
            return np.array([])

        X = np.array(features, dtype=np.float64)
        n = X.shape[0]
        scores = np.zeros(n, dtype=np.float64)

        # Columns: 0=recency, 1=frequency, 2=global_freq, 3=ia_mean,
        #          5=reuse_distance, 6=recent_window_freq, 8=trend, 9=density

        # Normalise each column to [0, 1] for safe combination
        def _norm(col):
            mn, mx = col.min(), col.max()
            if mx - mn < 1e-12:
                return np.full_like(col, 0.5)
            return (col - mn) / (mx - mn)

        recency_n = 1.0 - _norm(X[:, 0])     # low recency → high score
        freq_n = _norm(X[:, 1])
        rwf_n = _norm(X[:, 6])
        trend_n = _norm(X[:, 8])
        density_n = _norm(X[:, 9])
        rd_n = 1.0 - _norm(X[:, 5])          # low reuse-dist → high score

        scores = (
            0.30 * recency_n +
            0.15 * freq_n +
            0.25 * rwf_n +
            0.10 * trend_n +
            0.10 * density_n +
            0.10 * rd_n
        )
        return scores


class MLPredictor(PredictorInterface):
    """Scikit-learn based predictor (HistGradientBoostingClassifier).

    The model is loaded from a pickle/joblib file and used for
    predict_proba().  If loading fails, this predictor is unusable
    and callers should fall back to HeuristicPredictor.
    """

    def __init__(self, model_path: str = None):
        self._model = None
        self._model_path = model_path
        self._model_name = "None"
        if model_path and os.path.exists(model_path):
            self._load(model_path)

    def _load(self, path: str) -> None:
        try:
            import joblib
            self._model = joblib.load(path)
            self._model_name = type(self._model).__name__
            logger.info("Loaded ML model from %s (%s)", path, self._model_name)
        except Exception as e:
            logger.warning("Failed to load ML model from %s: %s", path, e)
            self._model = None

    @property
    def name(self) -> str:
        return f"MLPredictor({self._model_name})"

    @property
    def is_ready(self) -> bool:
        return self._model is not None

    def predict_reuse_probability(self, features: List[List[float]]) -> np.ndarray:
        if not features or self._model is None:
            return np.array([])

        X = np.array(features, dtype=np.float64)
        # predict_proba returns [[p_class0, p_class1], ...]
        proba = self._model.predict_proba(X)
        # class 1 = "will be reused" → return that probability
        return proba[:, 1]

    def load_model(self, path: str) -> bool:
        """Hot-reload a new model."""
        self._load(path)
        return self.is_ready
