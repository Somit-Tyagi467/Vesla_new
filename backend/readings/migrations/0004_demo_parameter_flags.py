from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("readings", "0003_batchanalysis")]

    operations = [
        migrations.AddField(
            model_name="reading",
            name="ph_is_demo",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="reading",
            name="pressure_is_demo",
            field=models.BooleanField(default=False),
        ),
    ]
