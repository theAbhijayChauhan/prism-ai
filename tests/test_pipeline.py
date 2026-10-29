"""PRISM AI: Unit & Integration Test Suite
Verifies multimodal pipeline, quality gating, and calibration.
"""

import unittest
import numpy as np
from PIL import Image
import io
import base64
from backend.app.services.inference_service import get_inference_engine
from backend.app.services.database import init_db, list_incidents, update_incident_review


class TestPrismPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.engine = get_inference_engine()

    def test_text_only_inference(self):
        text = "Flash flood trapped 6 residents on 2nd floor, water rising rapidly."
        res = self.engine.run_inference(text=text, image_base64=None, drop_vision=True)
        self.assertEqual(res["predicted_severity"], 4)
        self.assertEqual(res["quality_weights"]["alpha_vision"], 0.0)
        self.assertEqual(res["quality_weights"]["alpha_text"], 1.0)
        self.assertGreater(res["calibrated_confidence"], 50.0)

    def test_multimodal_clean_inference(self):
        # Create a small dummy flood-like image (blue/gray tones)
        img = Image.new("RGB", (100, 100), color=(50, 80, 120))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

        text = "Flash flood trapped 6 residents on 2nd floor, structural integrity compromised."
        res = self.engine.run_inference(text=text, image_base64=b64)
        
        self.assertIn("predicted_severity", res)
        self.assertIn("calibrated_confidence", res)
        self.assertIn("quality_weights", res)
        self.assertGreater(res["quality_weights"]["alpha_vision"], 0.0)
        self.assertGreater(res["quality_weights"]["alpha_text"], 0.0)

    def test_quality_gating_attenuates_blurry_vision(self):
        img = Image.new("RGB", (100, 100), color=(80, 100, 140))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

        text = "Emergency water surge reported."
        res_clean = self.engine.run_inference(text=text, image_base64=b64, blur_sigma=0.0)
        res_blurry = self.engine.run_inference(text=text, image_base64=b64, blur_sigma=8.0)

        # Vision weight should decrease when image is blurred
        v_clean = res_clean["quality_weights"]["alpha_vision"]
        v_blurry = res_blurry["quality_weights"]["alpha_vision"]
        self.assertLessEqual(v_blurry, v_clean)

    def test_database_incident_operations(self):
        incidents = list_incidents()
        self.assertGreater(len(incidents), 0)
        first_id = incidents[0]["id"]
        
        updated = update_incident_review(
            incident_id=first_id,
            status="VERIFIED",
            notes="Ground team confirmed water level 2.1m"
        )
        self.assertIsNotNone(updated)
        self.assertEqual(updated["status"], "VERIFIED")


if __name__ == "__main__":
    unittest.main()
