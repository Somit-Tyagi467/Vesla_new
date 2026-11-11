from django.core.management.base import BaseCommand
from django.db import transaction

from readings.analysis_engine import process_pending_batches
from readings.demo_data import fill_missing_demo_parameters
from readings.models import BatchAnalysis, Reading


class Command(BaseCommand):
    help = (
        "Backfill clearly marked demo pH/pressure values where absent and "
        "rebuild derived 96-reading analyses from saved readings."
    )

    def handle(self, *args, **options):
        readings = list(Reading.objects.order_by("id"))
        demo_updates = 0
        for reading in readings:
            before = (reading.ph, reading.pressure_kpa)
            fill_missing_demo_parameters(reading)
            if (reading.ph, reading.pressure_kpa) != before:
                demo_updates += 1

        device_ids = list(
            Reading.objects.order_by()
            .values_list("device_id", flat=True)
            .distinct()
        )
        with transaction.atomic():
            deleted, _ = BatchAnalysis.objects.all().delete()

        for device_id in device_ids:
            process_pending_batches(device_id)

        self.stdout.write(
            self.style.SUCCESS(
                f"Added demo values to {demo_updates} readings; rebuilt analyses "
                f"for {len(device_ids)} device(s). Removed {deleted} old derived analysis row(s)."
            )
        )
