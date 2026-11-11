from django.db import migrations


def backfill_purchased_devices(apps, schema_editor):
    StoreOrder = apps.get_model("readings", "StoreOrder")
    PurchasedDevice = apps.get_model("readings", "PurchasedDevice")
    database = schema_editor.connection.alias

    for order in StoreOrder.objects.using(database).all().iterator():
        for line_index, line in enumerate(order.items or []):
            quantity = line.get("quantity", 1)
            try:
                quantity = max(1, min(int(quantity), 99))
            except (TypeError, ValueError):
                quantity = 1
            for unit_index in range(quantity):
                PurchasedDevice.objects.using(database).get_or_create(
                    order_id=order.pk,
                    line_index=line_index,
                    unit_index=unit_index,
                    defaults={
                        "owner_id": order.owner_id,
                        "product_id": str(line.get("product_id", "unknown"))[:40],
                        "product_name": str(line.get("name", "Vesla device"))[:100],
                        "add_ons": line.get("add_ons", []),
                    },
                )


class Migration(migrations.Migration):
    dependencies = [
        ("readings", "0011_purchaseddevice"),
    ]

    operations = [
        migrations.RunPython(backfill_purchased_devices, migrations.RunPython.noop),
    ]
