#!/usr/bin/env node

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

// Create 1024x1024 canvas (standard for electron icons)
const canvas = createCanvas(1024, 1024)
const ctx = canvas.getContext('2d')

// Background - Blue gradient
const gradient = ctx.createLinearGradient(0, 0, 1024, 1024)
gradient.addColorStop(0, '#3B82F6')  // Blue
gradient.addColorStop(1, '#1D4ED8')  // Darker blue

// Rounded rectangle background
ctx.fillStyle = gradient
ctx.beginPath()
ctx.roundRect(0, 0, 1024, 1024, 200)
ctx.fill()

// POS Text
ctx.fillStyle = 'white'
ctx.font = 'bold 280px Arial'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('POS', 512, 380)

// Plus symbol - horizontal bar
ctx.fillStyle = 'white'
ctx.beginPath()
ctx.roundRect(432, 520, 160, 40, 20)
ctx.fill()

// Plus symbol - vertical bar
ctx.beginPath()
ctx.roundRect(492, 460, 40, 160, 20)
ctx.fill()

// Decorative line
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
ctx.beginPath()
ctx.roundRect(200, 720, 624, 8, 4)
ctx.fill()

// Save PNG
const buildDir = path.join(__dirname, '..', 'build')
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

const pngPath = path.join(buildDir, 'icon.png')
const buffer = canvas.toBuffer('image/png')
fs.writeFileSync(pngPath, buffer)

console.log(`Created PNG icon: ${pngPath}`)
console.log('Size: 1024x1024 pixels')

// Now convert to ICO format for Windows
console.log(`
Next step: Convert to ICO for Windows
Run: npx electron-icon-builder --input=build/icon.png --output=build --flatten
`)
