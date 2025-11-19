#!/bin/bash
# Create a simple icon using ImageMagick (if available)
# Otherwise, we'll use system icons

if command -v convert &> /dev/null; then
    # Create a simple checkmark icon for completed tasks (512x512 PNG)
    convert -size 512x512 xc:transparent \
        -gravity center \
        -stroke '#00ff00' -strokewidth 40 -fill none \
        -draw "path 'M 128,256 L 224,352 L 384,160'" \
        /Users/assim/Projects/bdui/assets/icons/completed.png
    
    # Create a simple block icon for blocked tasks
    convert -size 512x512 xc:transparent \
        -gravity center \
        -stroke '#ff0000' -strokewidth 40 -fill none \
        -draw "circle 256,256 256,128" \
        -draw "line 176,176 336,336" \
        /Users/assim/Projects/bdui/assets/icons/blocked.png
    
    echo "Icons created with ImageMagick"
else
    echo "ImageMagick not found. Using system icons fallback."
fi
