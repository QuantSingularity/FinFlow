from typing import Any
import logging
import os

import joblib
import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("credit-model-training")


def train_credit_model() -> Any:
    """
    Train a credit scoring model using synthetic data
    """
    logger.info("Starting credit model training")
    logger.info("Generating synthetic training data")
    X, y = make_classification(
        n_samples=1000,
        n_features=4,
        n_classes=3,
        n_informative=4,
        n_redundant=0,
        random_state=42,
    )
    X[:, 0] = np.abs(X[:, 0] * 50000 + 50000)
    X[:, 1] = np.abs(X[:, 1] * 20 + 10).astype(int)
    X[:, 2] = np.abs(X[:, 2] * 5000 + 5000)
    X[:, 3] = np.abs(X[:, 3] * 2).astype(int)
    y_adjusted = np.max(y) - y
    y_score = (y_adjusted + 1) / 4 + 0.1
    logger.info(f"Data generated: {X.shape[0]} samples with {X.shape[1]} features")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_score, test_size=0.2, random_state=42
    )
    logger.info(
        f"Training set: {X_train.shape[0]} samples, Test set: {X_test.shape[0]} samples"
    )
    logger.info("Training Random Forest Regressor model")
    clf = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    r2_score(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    train_score = clf.score(X_train, y_train)
    test_score = clf.score(X_test, y_test)
    logger.info(f"Model R² score - Training: {train_score:.4f}, Test: {test_score:.4f}")
    logger.info(f"Model Mean Squared Error (MSE) on Test Set: {mse:.4f}")
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "credit_score_model.pkl")
    logger.info(f"Saving model to {model_path}")
    joblib.dump(clf, model_path)
    logger.info("Credit model training completed successfully")
    return clf


if __name__ == "__main__":
    if not os.path.exists("models"):
        os.makedirs("models")
    train_credit_model()
