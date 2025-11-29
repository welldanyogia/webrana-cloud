#!/bin/bash

# Retry downloading failed images with different parameters or tools

echo "Retrying failed downloads..."

# Hero - Try adding simple params
echo "Downloading hero-dashboard.jpg..."
curl -L -o apps/customer-web/public/images/landing/hero-dashboard.jpg "https://images.unsplash.com/photo-1558494949-ef526b0042a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"

# Feature Payment
echo "Downloading feature-payment.jpg..."
curl -L -o apps/customer-web/public/images/landing/feature-payment.jpg "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"

# Check sizes
ls -l apps/customer-web/public/images/landing/

echo "Retry complete."
