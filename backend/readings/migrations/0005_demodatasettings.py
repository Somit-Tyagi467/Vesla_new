from django.db import migrations, models


def create_default_setting(apps, schema_editor):
    DemoDataSettings = apps.get_model("readings", "DemoDataSettings")
    DemoDataSettings.objects.get_or_create(pk=1, defaults={"enabled": False})


class Migration(migrations.Migration):
    dependencies = [("readings", "0004_demo_parameter_flags")]

    operations = [
        migrations.CreateModel(
            name="DemoDataSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("enabled", models.BooleanField(default=False, help_text="Show clearly marked sample pH/pressure values when a requested reading history contains no real values for that sensor. Sample values are generated for display only and are not saved.")),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "demo graph setting",
                "verbose_name_plural": "demo graph settings",
            },
        ),
        migrations.RunPython(create_default_setting, migrations.RunPython.noop),
    ]
