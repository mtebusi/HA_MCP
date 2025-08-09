#!/bin/bash

# Validate Home Assistant Add-on Configuration
echo "Home Assistant Add-on Configuration Validator"
echo "============================================="
echo ""

# Check for required files
echo "Checking required files..."
required_files=("config.yaml" "Dockerfile" "build.yaml" "apparmor.txt" "run.sh" "icon.png" "logo.png")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done
echo ""

# Validate config.yaml
echo "Validating config.yaml..."

# Check required fields
required_fields=("name:" "version:" "slug:" "description:" "arch:")
for field in "${required_fields[@]}"; do
    if grep -q "^$field" config.yaml; then
        echo "✅ $field found"
    else
        echo "❌ $field missing"
        exit 1
    fi
done

# Check for problematic default fields
default_fields=(
    "advanced:" "apparmor:" "audio:" "backup:" "boot:" "devicetree:" 
    "docker_api:" "full_access:" "gpio:" "hassio_role:" "host_dbus:" 
    "host_ipc:" "host_network:" "host_pid:" "host_uts:" "ingress:" 
    "ingress_stream:" "journald:" "kernel_modules:" "legacy:" 
    "panel_admin:" "realtime:" "stage:" "startup:" "stdin:" "timeout:" 
    "tmpfs:" "uart:" "udev:" "usb:" "video:" "watchdog:"
)

found_defaults=0
for field in "${default_fields[@]}"; do
    if grep -q "^$field" config.yaml; then
        echo "⚠️  Found default field that should be removed: $field"
        found_defaults=1
    fi
done

if [ $found_defaults -eq 0 ]; then
    echo "✅ No default value fields found"
fi

# Check for invalid properties
invalid_props=("auth_api_expiry:" "device_tree:" "security_rating:")
found_invalid=0
for prop in "${invalid_props[@]}"; do
    if grep -q "^$prop" config.yaml; then
        echo "⚠️  Found invalid property: $prop"
        found_invalid=1
    fi
done

if [ $found_invalid -eq 0 ]; then
    echo "✅ No invalid properties found"
fi

# Check mapping uses homeassistant_config
if grep -q "homeassistant_config:ro" config.yaml; then
    echo "✅ Using homeassistant_config mapping"
else
    if grep -q "config:ro" config.yaml; then
        echo "⚠️  Using deprecated 'config' mapping - should be 'homeassistant_config'"
    fi
fi

echo ""

# Check build.yaml
echo "Validating build.yaml..."
if grep -q "3.21" build.yaml; then
    echo "✅ Using latest base image (3.21)"
elif grep -q "3.20" build.yaml; then
    echo "⚠️  Using base image 3.20 (consider updating to 3.21)"
else
    echo "⚠️  Using outdated base image"
fi

# Check PNG files
echo ""
echo "Validating image files..."
for img in icon.png logo.png; do
    if file "$img" | grep -q "PNG image data"; then
        echo "✅ $img is valid PNG"
    else
        echo "⚠️  $img is not a valid PNG file"
    fi
done

echo ""
echo "============================================="
echo "Validation complete!"
echo ""
echo "If all checks pass, the add-on should pass the Home Assistant linter."