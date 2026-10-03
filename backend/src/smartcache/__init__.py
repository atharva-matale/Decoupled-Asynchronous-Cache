# SmartCache AI-assisted eviction engine
from src.smartcache.access_logger import AccessLogger
from src.smartcache.kill_list import KillList
from src.smartcache.feature_extractor import FeatureExtractor
from src.smartcache.predictor import HeuristicPredictor, MLPredictor, PredictorInterface
from src.smartcache.worker import BackgroundPredictionWorker
from src.smartcache.metrics import SmartCacheMetrics

__all__ = [
    'AccessLogger', 'KillList', 'FeatureExtractor',
    'HeuristicPredictor', 'MLPredictor', 'PredictorInterface',
    'BackgroundPredictionWorker', 'SmartCacheMetrics',
]
