# Amani Stays Hotel

A responsive multi-page hotel website for Amani Stays Hotel in Naivasha, Kenya.

## Pages

- `index.html` - Repository entry point
- `amani-stays-hotel.html` - Homepage
- `amani-stays-rooms.html` - Room listings and availability flow
- `amani-stays-packages.html` - Stay packages
- `amani-stays-gallery.html` - Photo gallery
- `amani-stays-questions.html` - Frequently asked questions
- `amani-stays-contact.html` - Contact and booking form

## Features

- Responsive desktop and mobile layouts
- Mobile navigation menu
- Availability search with guest and room steppers
- Room filtering and price sorting
- Gallery lightbox with keyboard navigation
- Booking request form
- Accessible focus states and skip navigation

## Run Locally

This is a static website with no build step or package installation required.

1. Open `index.html` in a browser, or serve the folder with any static file server.
2. For example, with Python installed:

```powershell
python -m http.server 8000
```

3. Visit `http://localhost:8000`.

The site uses Google Fonts, Unsplash images, and FormSubmit for booking form delivery, so those features require an internet connection when previewing.

## Project Structure

```text
.
├── assets/
│   ├── app.js
│   └── base.css
├── amani-stays-contact.html
├── amani-stays-gallery.html
├── amani-stays-hotel.html
├── amani-stays-packages.html
├── amani-stays-questions.html
├── amani-stays-rooms.html
├── favicon.svg
├── index.html
└── README.md
```
