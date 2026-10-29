"""PRISM AI: Evaluation & Model Card API Route
"""

from fastapi import APIRouter
from ml.evaluation.benchmarks import generate_evaluation_report

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])


@router.get("")
def get_evaluation_benchmarks():
    return generate_evaluation_report()
