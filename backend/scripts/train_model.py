"""
SmartCache ML Model Training Pipeline.

Usage:
    python scripts/train_model.py

Workflow:
    1. Load available trace files
    2. Simulate an LRU cache to generate realistic cache states
    3. Extract per-key features from historical access patterns
    4. Label each key with whether it will be reused within a horizon
    5. Chronological train/test split (NO random shuffling)
    6. Train a HistGradientBoostingClassifier
    7. Evaluate with accuracy, precision, recall, F1, ROC-AUC
    8. Save the trained model to models/smartcache_model.pkl
"""
import os
import sys
import time
import json
import warnings
import numpy as np

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report,
)
import joblib

from src.smartcache.access_logger import AccessLogger, AccessEvent
from src.smartcache.feature_extractor import FeatureExtractor, FEATURE_NAMES
from src.simulation.workload_loader import WorkloadLoader


def build_training_data(
    workload_names: list,
    cache_capacity: int = 64,
    horizon: int = 200,
    sample_interval: int = 50,
    limit: int = 10000,
):
    """Generate training data from multiple workloads.

    Returns:
        X: list of feature vectors
        y: list of labels (1 = reused within horizon, 0 = not)
    """
    X_all, y_all = [], []

    for name in workload_names:
        print(f"  Loading {name}...")
        try:
            keys = WorkloadLoader.load(name, limit=limit)
        except FileNotFoundError:
            print(f"    Skipping {name} (not found)")
            continue

        if len(keys) < cache_capacity + horizon:
            print(f"    Skipping {name} (too short: {len(keys)} keys)")
            continue

        # Convert keys to AccessEvent objects (simulating access stream)
        events = []
        for i, k in enumerate(keys):
            events.append(AccessEvent(
                sequence_number=i + 1,
                timestamp=float(i),
                key=k,
                hit=False,  # hit/miss doesn't matter for feature extraction
            ))

        print(f"    Extracting features from {len(events)} events (cap={cache_capacity}, horizon={horizon})...")
        X, y = FeatureExtractor.extract_training_examples(
            events,
            cache_capacity=cache_capacity,
            horizon=horizon,
            sample_interval=sample_interval,
        )
        print(f"    Generated {len(X)} training examples (positives={sum(y)}, negatives={len(y)-sum(y)})")
        X_all.extend(X)
        y_all.extend(y)

    return X_all, y_all


def train_model(X, y, test_fraction: float = 0.2):
    """Train and evaluate a HistGradientBoostingClassifier.

    Uses a chronological split: first (1 - test_fraction) for training,
    remainder for testing.  NO random shuffling.
    """
    X = np.array(X, dtype=np.float64)
    y = np.array(y, dtype=np.int32)

    n = len(X)
    split = int(n * (1 - test_fraction))

    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print(f"\n  Train set: {len(X_train)} samples")
    print(f"  Test set:  {len(X_test)} samples")
    print(f"  Train positives: {y_train.sum()} ({y_train.mean()*100:.1f}%)")
    print(f"  Test positives:  {y_test.sum()} ({y_test.mean()*100:.1f}%)")

    # Train
    print("\n  Training HistGradientBoostingClassifier...")
    t0 = time.time()

    model = HistGradientBoostingClassifier(
        max_iter=200,
        max_depth=6,
        learning_rate=0.1,
        min_samples_leaf=20,
        l2_regularization=0.1,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=15,
    )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model.fit(X_train, y_train)

    train_time = time.time() - t0
    print(f"  Training completed in {train_time:.2f}s")

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        'accuracy': round(accuracy_score(y_test, y_pred), 4),
        'precision': round(precision_score(y_test, y_pred, zero_division=0), 4),
        'recall': round(recall_score(y_test, y_pred, zero_division=0), 4),
        'f1': round(f1_score(y_test, y_pred, zero_division=0), 4),
        'roc_auc': round(roc_auc_score(y_test, y_proba), 4) if len(set(y_test)) > 1 else 0.0,
        'train_samples': int(len(X_train)),
        'test_samples': int(len(X_test)),
        'train_time_s': round(train_time, 2),
    }

    print("\n  === Model Evaluation ===")
    print(f"  Accuracy:  {metrics['accuracy']:.4f}")
    print(f"  Precision: {metrics['precision']:.4f}")
    print(f"  Recall:    {metrics['recall']:.4f}")
    print(f"  F1 Score:  {metrics['f1']:.4f}")
    print(f"  ROC-AUC:   {metrics['roc_auc']:.4f}")
    print()
    print("  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Not Reused', 'Reused'], zero_division=0))

    # Feature importance
    if hasattr(model, 'feature_importances_'):
        print("  Feature Importances:")
        importances = model.feature_importances_
        for fname, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1]):
            bar = '█' * int(imp * 50)
            print(f"    {fname:25s} {imp:.4f}  {bar}")
        print()

    return model, metrics


def main():
    print("=" * 60)
    print("  SmartCache ML Model Training Pipeline")
    print("=" * 60)

    # Configuration
    cache_capacity = 64
    horizon = 200
    sample_interval = 30
    trace_limit = 10000  # limit per trace for training speed
    test_fraction = 0.2

    # Use all available workloads
    available = WorkloadLoader.available_workloads()
    print(f"\n  Available workloads: {available}")

    if not available:
        print("  ERROR: No trace files found.")
        sys.exit(1)

    # Build training data
    print("\n--- Phase 1: Building Training Data ---")
    X, y = build_training_data(
        available,
        cache_capacity=cache_capacity,
        horizon=horizon,
        sample_interval=sample_interval,
        limit=trace_limit,
    )

    if len(X) < 100:
        print(f"  ERROR: Not enough training examples ({len(X)}). Need at least 100.")
        sys.exit(1)

    print(f"\n  Total training examples: {len(X)}")
    pos = sum(y)
    print(f"  Positive (reused): {pos} ({pos/len(y)*100:.1f}%)")
    print(f"  Negative (not reused): {len(y)-pos} ({(len(y)-pos)/len(y)*100:.1f}%)")

    # Train model
    print("\n--- Phase 2: Training Model ---")
    model, metrics = train_model(X, y, test_fraction=test_fraction)

    # Save model
    print("--- Phase 3: Saving Model ---")
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, 'smartcache_model.pkl')
    joblib.dump(model, model_path)
    print(f"  Model saved to: {model_path}")

    # Save metrics
    metrics_path = os.path.join(models_dir, 'training_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics saved to: {metrics_path}")

    print("\n" + "=" * 60)
    print("  Training Complete!")
    print("=" * 60)

    return metrics


if __name__ == '__main__':
    main()
