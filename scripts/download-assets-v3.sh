#!/bin/bash

# Force download new images with better keywords
# Use curl with -L to follow redirects and -o to overwrite
# Adding random query param to bypass potential caching on Unsplash side if any

echo "Downloading V3 assets (Desktop optimized)..."

# NVMe - Circuit/Chip - Vertical/Square oriented might be cropped, so getting landscape
curl -L -o apps/customer-web/public/images/landing/feature-nvme.jpg "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"

# Payment - Modern Payment Terminal / POS
curl -L -o apps/customer-web/public/images/landing/feature-payment.jpg "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"

echo "V3 Assets downloaded."
