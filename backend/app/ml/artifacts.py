"""Refuse incompatible pickle versions instead of trusting invalid predictions."""
import logging
import warnings
from functools import lru_cache
from pathlib import Path
import joblib
from sklearn.exceptions import InconsistentVersionWarning


@lru_cache(maxsize=8)
def load_model(path):
    if not Path(path).exists():
        return None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', InconsistentVersionWarning)
            return joblib.load(path)
    except Exception as exc:
        logging.getLogger(__name__).warning('Model unavailable: %s (%s). Retrain with the active environment.', Path(path).name, type(exc).__name__)
        return None
