import json

from django.contrib.auth import get_user_model
from django.test import TestCase


class DevicePairingAndOwnershipTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username="device-owner", password="test-only-password-439!")
        self.other_user = User.objects.create_user(username="other-owner", password="test-only-password-439!")

    def test_pairing_code_claims_device_and_readings_are_owner_scoped(self):
        self.client.force_login(self.owner)
        code_response = self.client.post("/api/devices/pairing-code/", data="{}", content_type="application/json")
        self.assertEqual(code_response.status_code, 200)
        pairing_code = code_response.json()["pairing_code"]

        device_client = self.client_class()
        claim_response = device_client.post(
            "/api/devices/claim/",
            data=json.dumps({
                "pairing_code": pairing_code,
                "device_id": "VESLA-TEST-001",
                "name": "Local test monitor",
            }),
            content_type="application/json",
        )
        self.assertEqual(claim_response.status_code, 201)
        device_api_key = claim_response.json()["device_api_key"]

        reading_response = device_client.post(
            "/api/readings/",
            data=json.dumps({"device_id": "VESLA-TEST-001", "tds_ppm": 42.0}),
            content_type="application/json",
            HTTP_X_VESLA_DEVICE_KEY=device_api_key,
        )
        self.assertEqual(reading_response.status_code, 201)

        owner_readings = self.client.get("/api/readings/?limit=10")
        self.assertEqual(owner_readings.status_code, 200)
        self.assertEqual(len(owner_readings.json()), 1)
        self.assertEqual(owner_readings.json()[0]["device_id"], "VESLA-TEST-001")

        self.client.force_login(self.other_user)
        other_readings = self.client.get("/api/readings/?limit=10")
        self.assertEqual(other_readings.status_code, 200)
        self.assertEqual(other_readings.json(), [])

    def test_pairing_code_cannot_be_reused(self):
        self.client.force_login(self.owner)
        code_response = self.client.post("/api/devices/pairing-code/", data="{}", content_type="application/json")
        pairing_code = code_response.json()["pairing_code"]
        device_client = self.client_class()
        payload = json.dumps({"pairing_code": pairing_code, "device_id": "VESLA-TEST-002"})

        first_claim = device_client.post("/api/devices/claim/", data=payload, content_type="application/json")
        second_claim = device_client.post("/api/devices/claim/", data=payload, content_type="application/json")

        self.assertEqual(first_claim.status_code, 201)
        self.assertEqual(second_claim.status_code, 400)
