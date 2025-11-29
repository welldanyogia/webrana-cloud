#!/bin/bash

# Create directory if it doesn't exist
mkdir -p apps/customer-web/public/images/landing

# Download images
echo "Downloading assets..."

# Hero
wget -O apps/customer-web/public/images/landing/hero-dashboard.jpg "https://images.unsplash.com/photo-1558494949-ef526b0042a0"

# Features
wget -O apps/customer-web/public/images/landing/feature-nvme.jpg "https://images.unsplash.com/photo-1591488320449-011701bb6704"
wget -O apps/customer-web/public/images/landing/feature-location.jpg "https://images.unsplash.com/photo-1451187580459-43490279c0fa"
wget -O apps/customer-web/public/images/landing/feature-speed.jpg "https://images.unsplash.com/photo-1501163268664-3fdf329d019f"
wget -O apps/customer-web/public/images/landing/feature-payment.jpg "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d"

# Why Us
wget -O apps/customer-web/public/images/landing/why-us-dev.jpg "https://images.unsplash.com/photo-1555066931-4365d14bab8c"

echo "Assets downloaded successfully."
