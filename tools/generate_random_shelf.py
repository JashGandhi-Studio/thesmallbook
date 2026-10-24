# Generator for random.html with 3D Bookshelf and Physics
import sys

content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1">
  <title>3D Interactive Bookshelf & Discovery | TheSmallBook</title>
  <meta name="description" content="Explore TheSmallBook 3D interactive library bookshelf. Touch books on the shelf, inspect spines in 3D, enjoy realistic falling physics, and read executive summaries.">
  <meta property="og:title" content="3D Interactive Bookshelf | TheSmallBook">
  <meta property="og:description" content="Touch books on the shelf, pull them into 3D space, and experience realistic physics.">
  <meta property="og:image" content="https://thesmallbook.in/assets/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css?v=323">
  <link rel="icon" href="favicon.ico" sizes="32x32">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#ffc800">
  <style>
    :root {
      --ink: #111111;
      --paper: #fffdf5;
      --paper-warm: #fcf9ee;
      --yellow: #ffc800;
      --red: #ff5a5f;
      --book-w: 320px;
      --book-h: 480px;
      --book-depth: 38px;
      --book-open-w: 880px;
      --book-open-h: 540px;
      --wood-dark: #221811;
      --wood-mid: #38271b;
      --wood-plank: #4e3524;
      --brass-gold: #c69f58;
    }

    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      margin: 0;
      padding: 0;
      min-height: 100dvh;
      background: #14100c;
      color: var(--ink);
      font-family: "Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      user-select: none;
      -webkit-user-select: none;
    }

    /* ATMOSPHERIC LIBRARY ENVIRONMENT */
    .library-env {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(ellipse at 50% 18%, rgba(255, 240, 205, 0.12) 0%, transparent 60%),
        radial-gradient(ellipse at 50% 75%, rgba(255, 230, 180, 0.45) 0%, rgba(140, 110, 75, 0.3) 45%, rgba(20, 16, 12, 0.95) 85%, #0e0a07 100%);
    }

    /* Studio Desk Wood Surface in Foreground */
    .desk-surface {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 46%;
      background: linear-gradient(to bottom, #cca775 0%, #b38b55 25%, #886234 70%, #5d3f1d 100%);
      box-shadow: inset 0 12px 30px rgba(0,0,0,0.4);
      border-top: 4px solid rgba(0,0,0,0.45);
      z-index: 2;
      pointer-events: none;
    }

    /* Main App Nav Header */
    .nav {
      position: relative;
      z-index: 50;
      width: 100%;
      border-bottom: 3px solid var(--ink);
      background: var(--paper, #fffdf5);
    }
    .nav__right-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-header-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fff;
      color: var(--ink);
      border: 2px solid var(--ink);
      border-radius: 999px;
      padding: 7px 14px;
      font-family: "Archivo Black", sans-serif;
      font-size: 11.5px;
      text-decoration: none;
      box-shadow: 2px 2px 0 var(--ink);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn-header-link:hover {
      background: #f4efe2;
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0 var(--ink);
    }

    .btn-roll-header {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--yellow);
      color: var(--ink);
      border: 2.5px solid var(--ink);
      border-radius: 999px;
      padding: 8px 18px;
      font-family: "Archivo Black", sans-serif;
      font-size: 12.5px;
      letter-spacing: 0.3px;
      cursor: pointer;
      box-shadow: 2.5px 2.5px 0 var(--ink);
      transition: transform 0.1s, box-shadow 0.1s, background 0.1s;
      white-space: nowrap;
    }
    .btn-roll-header:hover {
      background: #ffd633;
      transform: translate(-1px, -1px);
      box-shadow: 3.5px 3.5px 0 var(--ink);
    }
    .btn-roll-header:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 var(--ink);
    }
    .btn-roll-dice {
      font-size: 16px;
      display: inline-block;
      transition: transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1);
    }

    /* Small Close Button in Header when Book is open */
    .btn-close-header {
      display: none;
      align-items: center;
      gap: 5px;
      background: #fff;
      color: var(--ink);
      border: 2px solid var(--ink);
      border-radius: 999px;
      padding: 7px 14px;
      font-family: "Archivo Black", sans-serif;
      font-size: 11.5px;
      cursor: pointer;
      box-shadow: 2px 2px 0 var(--ink);
      transition: transform 0.1s;
    }
    .btn-close-header:hover {
      background: #f0ede4;
      transform: translate(-1px, -1px);
    }

    /* MAIN CONTAINER */
    .rnd-wrapper {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 1180px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 14px 40px;
      flex: 1;
    }

    /* =========================================================
       1. THE PHYSICAL 3D BOOKSHELF RACK
       ========================================================= */
    .bookshelf-unit {
      position: relative;
      width: 100%;
      max-width: 1040px;
      margin: 12px 0 20px;
      perspective: 1400px;
      perspective-origin: 50% 30%;
      z-index: 15;
    }

    /* Bookshelf Control Bar: Category Filters & Physics Action */
    .shelf-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .shelf-filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      padding: 2px;
    }
    .shelf-filter-group::-webkit-scrollbar {
      display: none;
    }
    .shelf-pill {
      background: rgba(30, 24, 18, 0.85);
      color: #e5dac6;
      border: 1.5px solid #5a4430;
      border-radius: 999px;
      padding: 5px 12px;
      font-family: "Archivo Black", sans-serif;
      font-size: 10.5px;
      letter-spacing: 0.4px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.18s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }
    .shelf-pill:hover {
      background: #3e2e1e;
      color: #fff;
      border-color: #ffc800;
    }
    .shelf-pill.active {
      background: var(--yellow);
      color: var(--ink);
      border-color: var(--ink);
      box-shadow: 2px 2px 0 var(--ink);
    }

    .shelf-actions-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .shelf-tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(30, 24, 18, 0.9);
      color: #ffc800;
      border: 1.5px solid #ffc800;
      border-radius: 999px;
      padding: 5px 11px;
      font-family: "Archivo Black", sans-serif;
      font-size: 10px;
      letter-spacing: 0.3px;
      cursor: pointer;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.5);
      transition: all 0.15s;
      white-space: nowrap;
    }
    .shelf-tool-btn:hover {
      background: #ffc800;
      color: #111;
      transform: translateY(-1px);
    }
    .shelf-tool-btn:active {
      transform: translateY(1px);
    }

    /* Shelf Cabinet Structure */
    .shelf-cabinet {
      position: relative;
      background: linear-gradient(to bottom, #1f1610 0%, #150f0b 100%);
      border: 3.5px solid #3d2a1c;
      border-radius: 12px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.85), inset 0 2px 10px rgba(255,255,255,0.06);
      padding: 24px 16px 14px;
      transform-style: preserve-3d;
      overflow: visible;
    }

    /* Top Arch & Shadow of Shelf */
    .shelf-cabinet::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 18px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
      pointer-events: none;
      z-index: 10;
    }

    /* Shelf Navigation Buttons */
    .shelf-arrow-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 52px;
      background: rgba(22, 17, 13, 0.92);
      color: #ffc800;
      border: 2px solid #5a4430;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      z-index: 25;
      box-shadow: 0 4px 12px rgba(0,0,0,0.7);
      transition: all 0.15s;
    }
    .shelf-arrow-btn:hover {
      background: #ffc800;
      color: #111;
      border-color: #111;
      box-shadow: 0 4px 14px rgba(255,200,0,0.4);
    }
    .shelf-arrow--left {
      left: 6px;
    }
    .shelf-arrow--right {
      right: 6px;
    }

    /* The Scrollable Track of Books */
    .shelf-track-container {
      position: relative;
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      padding: 10px 42px 6px;
      perspective: 1200px;
    }
    .shelf-track-container::-webkit-scrollbar {
      display: none;
    }

    .shelf-books-row {
      display: inline-flex;
      align-items: flex-end;
      gap: 3px;
      min-width: 100%;
      height: 195px;
      padding-bottom: 2px;
      transform-style: preserve-3d;
    }

    /* Bookend on shelf */
    .shelf-bookend {
      width: 18px;
      height: 140px;
      background: linear-gradient(to right, #6b5333 0%, #b3905c 40%, #4a3821 100%);
      border: 1.5px solid #2a1f12;
      border-radius: 4px;
      box-shadow: 2px 4px 10px rgba(0,0,0,0.6);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffebad;
      font-size: 11px;
    }

    /* INDIVIDUAL SHELF BOOK */
    .shelf-book {
      position: relative;
      transform-style: preserve-3d;
      flex-shrink: 0;
      cursor: pointer;
      transform-origin: bottom center;
      transition:
        transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1),
        box-shadow 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);
    }

    /* Hover & Touch Hover state: Slides out forward into 3D! */
    .shelf-book:hover,
    .shelf-book.is-focused {
      transform: translateZ(36px) translateY(-12px) rotateY(-3deg) !important;
      z-index: 30 !important;
    }

    /* Tooltip above hovered book */
    .shelf-book-tooltip {
      position: absolute;
      bottom: calc(100% + 12px);
      left: 50%;
      transform: translateX(-50%) translateY(6px);
      background: #111;
      color: #fff;
      border: 2px solid var(--yellow);
      border-radius: 8px;
      padding: 7px 12px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.8), 3px 3px 0 var(--yellow);
      pointer-events: none;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.18s, transform 0.18s, visibility 0.18s;
      z-index: 50;
      text-align: center;
    }
    .shelf-book:hover .shelf-book-tooltip,
    .shelf-book.is-focused .shelf-book-tooltip {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
    .shelf-tooltip-cat {
      font-size: 9px;
      font-weight: 800;
      color: var(--yellow);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .shelf-tooltip-title {
      font-family: "Archivo Black", sans-serif;
      font-size: 12px;
      color: #fff;
      margin-bottom: 2px;
    }
    .shelf-tooltip-sub {
      font-size: 10px;
      color: #bbb;
    }

    /* The Realistic Spine of a Shelf Book */
    .shelf-book-spine {
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: 4px 4px 2px 2px;
      border: 1.5px solid rgba(0,0,0,0.6);
      box-shadow:
        inset 2px 0 4px rgba(255,255,255,0.2),
        inset -3px 0 5px rgba(0,0,0,0.7),
        2px 4px 8px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 8px 3px;
      overflow: hidden;
      transform-style: preserve-3d;
    }

    /* Cylindrical Spine Curvature Gradient */
    .shelf-book-spine::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(to right,
        rgba(0,0,0,0.45) 0%,
        rgba(255,255,255,0.22) 20%,
        rgba(255,255,255,0.02) 55%,
        rgba(0,0,0,0.6) 100%
      );
      pointer-events: none;
    }

    /* Embossed Horizontal Ribs along the spine */
    .shelf-spine-rib {
      position: absolute;
      left: 0;
      right: 0;
      height: 3.5px;
      background: linear-gradient(to bottom, #d4af37 0%, #aa8010 50%, #443000 100%);
      box-shadow: 0 1px 2px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.4);
      pointer-events: none;
    }
    .rib-1 { top: 16%; }
    .rib-2 { top: 40%; }
    .rib-3 { top: 64%; }
    .rib-4 { top: 88%; }

    /* Spine Vertical Text */
    .shelf-spine-title {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      font-family: "Space Grotesk", sans-serif;
      font-weight: 700;
      font-size: 10.5px;
      letter-spacing: 0.8px;
      color: #ffebad;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      max-height: 120px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      z-index: 5;
    }
    .shelf-spine-author {
      font-size: 8px;
      font-weight: 800;
      color: #d8c29d;
      letter-spacing: 0.4px;
      text-align: center;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      max-height: 42px;
      overflow: hidden;
      white-space: nowrap;
      z-index: 5;
    }

    /* THE SOLID WOODEN SHELF PLANK */
    .shelf-plank {
      position: relative;
      height: 20px;
      background: linear-gradient(to bottom, #604128 0%, #462c18 60%, #2f1d10 100%);
      border-top: 2px solid #855c3a;
      border-bottom: 2px solid #1a0f07;
      border-radius: 2px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.18);
      margin-top: -2px;
      z-index: 12;
    }
    .shelf-plank::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      height: 16px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%);
      pointer-events: none;
    }

    /* PHYSICS ANIMATION: Book is picked from shelf */
    .shelf-book.is-picked {
      animation: shelfBookPick 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) forwards !important;
      z-index: 40 !important;
    }
    @keyframes shelfBookPick {
      0% {
        transform: translateZ(0) translateY(0);
      }
      40% {
        transform: translateZ(80px) translateY(-20px) scale(1.08);
        opacity: 1;
      }
      100% {
        transform: translateZ(140px) translateY(120px) scale(1.2);
        opacity: 0;
      }
    }

    /* PHYSICS ANIMATION: Book knocked and falling off the shelf! */
    .shelf-book.is-falling {
      position: relative;
      z-index: 100 !important;
      pointer-events: none;
      animation: shelfBookFall 0.75s cubic-bezier(0.4, 0, 0.8, 1) forwards !important;
    }
    @keyframes shelfBookFall {
      0% {
        transform: translateZ(20px) rotateX(0deg) rotateZ(0deg) translateY(0);
        opacity: 1;
      }
      22% {
        transform: translateZ(40px) rotateX(32deg) rotateZ(16deg) translateY(15px);
        opacity: 1;
      }
      60% {
        transform: translateZ(70px) rotateX(85deg) rotateZ(42deg) translateY(180px);
        opacity: 0.95;
      }
      100% {
        transform: translateZ(90px) rotateX(150deg) rotateZ(80deg) translateY(120vh);
        opacity: 0;
      }
    }

    /* =========================================================
       2. THE READING DESK STAGE (ACTIVE 3D ROTATABLE BOOK)
       ========================================================= */
    .desk-stage {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: 10px;
      z-index: 20;
    }

    /* Hint Pill */
    .rnd-hint-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      border: 2px solid var(--ink);
      border-radius: 999px;
      padding: 6px 18px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.4px;
      box-shadow: 2.5px 2.5px 0 var(--ink);
      margin-bottom: 12px;
      transition: opacity 0.3s;
    }
    .rnd-hint-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulseGreen 1.4s infinite ease-in-out;
    }
    @keyframes pulseGreen {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.5; }
    }

    /* Desk Quick Tools Row */
    .desk-tools-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }
    .desk-pill-btn {
      background: #fff;
      color: var(--ink);
      border: 2px solid var(--ink);
      border-radius: 999px;
      padding: 6px 14px;
      font-family: "Archivo Black", sans-serif;
      font-size: 11px;
      letter-spacing: 0.3px;
      cursor: pointer;
      box-shadow: 2px 2px 0 var(--ink);
      transition: transform 0.1s, box-shadow 0.1s, background 0.1s;
    }
    .desk-pill-btn:hover {
      background: #f7f3e9;
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0 var(--ink);
    }
    .desk-pill-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 var(--ink);
    }

    /* 3D BOOK THEATER VIEWPORT */
    .book-theater {
      perspective: 1600px;
      perspective-origin: 50% 46%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 8px 0 24px;
      min-height: 540px;
    }

    /* THE PHYSICAL 3D BOOK WRAPPER */
    .book-physical {
      position: relative;
      transform-style: preserve-3d;
      will-change: transform, width, height;
      transition:
        width 0.75s cubic-bezier(0.2, 0.9, 0.25, 1),
        height 0.75s cubic-bezier(0.2, 0.9, 0.25, 1);
    }

    /* CLOSED 3D REALISTIC ROTATABLE BOOK */
    .book-physical.is-closed {
      width: var(--book-w);
      height: var(--book-h);
      cursor: grab;
      touch-action: none;
    }
    .book-physical.is-closed:active {
      cursor: grabbing;
    }

    /* OPEN 3D STATE: Flat, level, razor-sharp spread with zero perspective tilt! */
    .book-physical.is-open {
      width: min(var(--book-open-w), 96vw);
      height: auto;
      min-height: var(--book-open-h);
      transform: rotateY(0deg) rotateX(0deg) translateY(0) !important;
      cursor: default;
    }

    /* PHYSICS ANIMATION: 3D Book Falling Down Off the Desk! */
    .book-physical.falling-down {
      transform: translateY(135vh) rotateX(50deg) rotateZ(-24deg) rotateY(-20deg) !important;
      opacity: 0 !important;
      transition: transform 0.48s cubic-bezier(0.4, 0, 0.8, 1), opacity 0.35s ease !important;
    }

    /* PHYSICS ANIMATION: New Book Drops Down From Shelf Above! */
    .book-physical.falling-from-shelf {
      animation: bookDropFromShelf 0.65s cubic-bezier(0.18, 0.89, 0.32, 1.15) forwards !important;
    }

    @keyframes bookDropFromShelf {
      0% {
        transform: translateY(-110vh) rotateX(-28deg) rotateZ(10deg);
        opacity: 0;
      }
      72% {
        transform: translateY(14px) rotateX(4deg) rotateZ(-2deg);
        opacity: 1;
      }
      88% {
        transform: translateY(-6px) rotateX(-2deg) rotateZ(1deg);
        opacity: 1;
      }
      100% {
        transform: rotateY(-20deg) rotateX(10deg) translateY(0);
        opacity: 1;
      }
    }

    /* Dynamic Floor Ambient Shadow */
    .book-shadow {
      position: absolute;
      bottom: -24px;
      left: 5%;
      width: 90%;
      height: 44px;
      background: radial-gradient(ellipse at center, rgba(17, 17, 17, 0.5) 0%, rgba(17, 17, 17, 0.16) 50%, transparent 75%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      transition: all 0.6s cubic-bezier(0.2, 0.9, 0.25, 1);
    }
    .book-physical.is-open .book-shadow {
      bottom: -32px;
      width: 98%;
      height: 60px;
      left: 1%;
      background: radial-gradient(ellipse at center, rgba(17, 17, 17, 0.55) 0%, rgba(17, 17, 17, 0.18) 55%, transparent 80%);
    }

    /* 3D REALISTIC BOOK SPINE (Left Edge) */
    .book-spine-3d {
      position: absolute;
      top: 0;
      left: 0;
      width: var(--book-depth);
      height: 100%;
      background: linear-gradient(to right, #110f0d 0%, #2a241f 45%, #181513 100%);
      transform: rotateY(-90deg) translateX(-100%);
      transform-origin: left top;
      border: 2px solid var(--ink);
      border-radius: 4px 0 0 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 18px 4px;
      color: #ffc800;
      font-size: 10px;
      font-weight: 800;
      box-shadow: inset 3px 0 6px rgba(255,255,255,0.15), inset -4px 0 8px rgba(0,0,0,0.65);
      backface-visibility: hidden;
      transition: opacity 0.3s;
      z-index: 10;
    }
    .book-physical.is-open .book-spine-3d {
      opacity: 0;
      pointer-events: none;
    }
    .book-spine-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      letter-spacing: 1.2px;
      max-height: 310px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* 3D REALISTIC PAGES BLOCK EDGES (Stacked Paper) */
    .book-pages-right {
      position: absolute;
      top: 6px;
      right: 0;
      width: var(--book-depth);
      height: calc(100% - 12px);
      background: repeating-linear-gradient(to right, #fbf7ee 0px, #fbf7ee 2px, #eadcc4 2px, #eadcc4 4px);
      transform: rotateY(90deg) translateX(0);
      transform-origin: right center;
      border: 1px solid #c9baa0;
      border-left: none;
      box-shadow: inset 6px 0 12px rgba(0,0,0,0.24);
      transition: opacity 0.3s;
      z-index: 5;
    }
    .book-pages-top {
      position: absolute;
      top: 0;
      left: 6px;
      width: calc(100% - 12px);
      height: var(--book-depth);
      background: repeating-linear-gradient(to bottom, #fbf7ee 0px, #fbf7ee 2px, #eadcc4 2px, #eadcc4 4px);
      transform: rotateX(90deg) translateY(-100%);
      transform-origin: top center;
      border: 1px solid #c9baa0;
      border-bottom: none;
      box-shadow: inset 0 6px 12px rgba(0,0,0,0.22);
      transition: opacity 0.3s;
      z-index: 5;
    }
    .book-pages-bottom {
      position: absolute;
      bottom: 0;
      left: 6px;
      width: calc(100% - 12px);
      height: var(--book-depth);
      background: repeating-linear-gradient(to top, #fbf7ee 0px, #fbf7ee 2px, #eadcc4 2px, #eadcc4 4px);
      transform: rotateX(-90deg) translateY(100%);
      transform-origin: bottom center;
      border: 1px solid #c9baa0;
      border-top: none;
      box-shadow: inset 0 -6px 12px rgba(0,0,0,0.22);
      transition: opacity 0.3s;
      z-index: 5;
    }

    /* 3D BACK COVER */
    .book-back-cover {
      position: absolute;
      inset: 0;
      border-radius: 4px 14px 14px 4px;
      background: #181513;
      border: 3.5px solid var(--ink);
      transform: translateZ(calc(var(--book-depth) * -1)) rotateY(180deg);
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #ffc800;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.6);
      z-index: 1;
    }
    .book-back-crest {
      border: 2px solid #ffc800;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
      background: rgba(0,0,0,0.4);
    }

    .book-physical.is-open .book-pages-right,
    .book-physical.is-open .book-pages-top,
    .book-physical.is-open .book-pages-bottom,
    .book-physical.is-open .book-back-cover {
      opacity: 0;
      pointer-events: none;
    }

    /* THE FRONT COVER HINGE DOOR (Swings open 180deg in 3D) */
    .book-cover-door {
      position: absolute;
      top: 0;
      left: 0;
      width: var(--book-w);
      height: var(--book-h);
      transform-origin: left center;
      transform-style: preserve-3d;
      transition: transform 0.9s cubic-bezier(0.22, 0.9, 0.25, 1);
      z-index: 30;
      will-change: transform;
    }
    .book-physical.is-open .book-cover-door {
      transform: rotateY(-180deg);
      pointer-events: none;
    }

    /* Front side of door: High-res Cover Art */
    .book-cover-front {
      position: absolute;
      inset: 0;
      border-radius: 4px 14px 14px 4px;
      overflow: hidden;
      border: 3.5px solid var(--ink);
      background: #221d19;
      backface-visibility: hidden;
      box-shadow:
        inset 16px 0 20px rgba(0,0,0,0.35),
        6px 6px 0 var(--ink),
        0 14px 28px rgba(0,0,0,0.35);
    }
    .book-cover-front img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Back side of door: Endpaper & Bookplate */
    .book-cover-inside {
      position: absolute;
      inset: 0;
      border-radius: 14px 4px 4px 14px;
      background: #fbf7eb;
      border: 3.5px solid var(--ink);
      transform: rotateY(180deg);
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-shadow: inset 0 0 25px rgba(0,0,0,0.12);
    }
    .bookplate-box {
      background: #fff;
      border: 2px dashed var(--ink);
      border-radius: 12px;
      padding: 20px 16px;
      width: 85%;
      box-shadow: 3px 3px 0 rgba(0,0,0,0.15);
      text-align: center;
    }
    .bookplate-title {
      font-family: "Archivo Black", sans-serif;
      font-size: 14px;
      color: var(--ink);
      margin-bottom: 4px;
    }
    .bookplate-sub {
      font-size: 11px;
      color: #666;
      font-weight: 700;
    }

    /* THE OPENED TWO-PAGE SPREAD */
    .book-opened-spread {
      position: relative;
      z-index: 10;
      background: #181513;
      border: 3.5px solid var(--ink);
      border-radius: 14px;
      box-shadow: 8px 10px 0 var(--ink), 0 20px 40px rgba(0,0,0,0.25);
      padding: 10px;
      width: 100%;
      height: 100%;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s ease 0.3s;
    }
    .book-physical.is-open .book-opened-spread {
      opacity: 1;
      pointer-events: auto;
    }

    /* Center Spine Gutter Shadow */
    .book-opened-spread::before {
      content: "";
      position: absolute;
      top: 10px;
      bottom: 10px;
      left: 50%;
      width: 38px;
      transform: translateX(-50%);
      background: linear-gradient(to right,
        rgba(0,0,0,0.18) 0%,
        rgba(0,0,0,0.06) 20%,
        transparent 35%,
        rgba(0,0,0,0.28) 49%,
        rgba(0,0,0,0.36) 50%,
        rgba(0,0,0,0.28) 51%,
        transparent 65%,
        rgba(0,0,0,0.06) 80%,
        rgba(0,0,0,0.18) 100%
      );
      pointer-events: none;
      z-index: 15;
    }

    /* Silk Ribbon hanging from bottom */
    .book-silk-ribbon {
      position: absolute;
      bottom: -22px;
      left: 50%;
      transform: translateX(-50%);
      width: 14px;
      height: 34px;
      background: var(--red);
      border: 2px solid var(--ink);
      border-top: none;
      box-shadow: 2px 2px 0 var(--ink);
      z-index: 18;
      clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%);
    }

    /* Crisp Pages Grid (100% sharp, zero blur) */
    .spread-pages-grid {
      background: var(--paper-warm);
      border: 2px solid #332f2b;
      border-radius: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      overflow: hidden;
      position: relative;
    }

    /* Left Page */
    .page-col-left {
      padding: 34px 28px 28px 36px;
      border-right: 1.5px solid #ded3be;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fffdf8;
    }

    /* Right Page */
    .page-col-right {
      padding: 34px 36px 28px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fffdf8;
    }

    /* Typography & Elements */
    .page-top-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .category-stamp {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--yellow);
      color: var(--ink);
      border: 2px solid var(--ink);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      box-shadow: 2px 2px 0 var(--ink);
    }
    .readtime-stamp {
      font-size: 11px;
      font-weight: 700;
      color: #666;
    }

    .hero-book-title {
      font-family: "Archivo Black", sans-serif;
      font-size: 26px;
      line-height: 1.18;
      color: var(--ink);
      margin: 0 0 6px;
      letter-spacing: -0.3px;
    }
    .hero-book-author {
      font-size: 14px;
      font-weight: 700;
      color: #555;
      margin: 0 0 16px;
    }

    /* The Big Idea Box */
    .bigidea-box {
      background: #fbf6e8;
      border: 2px solid var(--ink);
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
      box-shadow: 3px 3px 0 var(--ink);
    }
    .bigidea-header {
      font-family: "Archivo Black", sans-serif;
      font-size: 10.5px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .bigidea-content {
      font-size: 13.5px;
      line-height: 1.5;
      font-weight: 600;
      color: var(--ink);
      margin: 0;
    }

    /* Lessons Section */
    .kicker-label {
      font-family: "Archivo Black", sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #666;
      margin-bottom: 8px;
    }
    .lessons-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .lesson-item-box {
      background: #fff;
      border: 1.5px solid var(--ink);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12.5px;
      line-height: 1.4;
    }
    .lesson-item-title {
      font-weight: 800;
      color: var(--ink);
      display: block;
      margin-bottom: 2px;
    }
    .lesson-item-summary {
      color: #333;
    }

    /* Close Cover Toggle Button on Page */
    .btn-close-cover {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      color: #888;
      border: none;
      padding: 8px 0 0;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      align-self: center;
      transition: color 0.1s;
    }
    .btn-close-cover:hover {
      color: var(--ink);
    }

    /* Right Page: Quote Card */
    .quote-callout {
      font-family: "Newsreader", Georgia, serif;
      font-style: italic;
      font-size: 16px;
      line-height: 1.45;
      color: #111;
      background: #fffdf2;
      border-left: 3.5px solid var(--ink);
      border-radius: 0 8px 8px 0;
      padding: 12px 14px;
      margin-bottom: 16px;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.05);
    }
    .quote-glyph {
      font-size: 26px;
      line-height: 0;
      vertical-align: -6px;
      color: var(--yellow);
      font-style: normal;
      margin-right: 4px;
    }

    /* 5-Step Action Plan */
    .plan-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    .plan-step-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      line-height: 1.35;
      color: #222;
    }
    .plan-step-num {
      width: 18px;
      height: 18px;
      background: var(--yellow);
      border: 1.5px solid var(--ink);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Caveat Alert */
    .caveat-callout {
      font-size: 11.5px;
      line-height: 1.4;
      color: #555;
      background: #fff0f0;
      border: 1.5px solid #ff9999;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 18px;
    }
    .caveat-callout b {
      color: #dc2626;
    }

    /* Action CTA */
    .primary-cta-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-read-breakdown {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      text-align: center;
      background: var(--yellow);
      color: var(--ink);
      border: 3px solid var(--ink);
      border-radius: 12px;
      padding: 13px 16px;
      font-family: "Archivo Black", sans-serif;
      font-size: 14px;
      letter-spacing: 0.3px;
      text-decoration: none;
      box-shadow: 4px 4px 0 var(--ink);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s, background 0.1s;
    }
    .btn-read-breakdown:hover {
      background: #ffd633;
      transform: translate(-1px, -1px);
      box-shadow: 5px 5px 0 var(--ink);
    }
    .btn-read-breakdown:active {
      transform: translate(1px, 1px);
      box-shadow: 2px 2px 0 var(--ink);
    }

    /* Clean Footer */
    .rnd-clean-footer {
      font-size: 12px;
      color: #b5a48b;
      font-weight: 700;
      margin-top: 24px;
      text-align: center;
    }

    /* Mobile Responsiveness */
    @media (max-width: 760px) {
      :root {
        --book-w: 280px;
        --book-h: 420px;
      }
      .rnd-wrapper {
        padding: 8px 10px 30px;
      }
      .shelf-track-container {
        padding: 8px 14px 4px;
      }
      .shelf-arrow-btn {
        display: none;
      }
      .book-theater {
        min-height: 460px;
      }
      .book-opened-spread {
        padding: 6px;
        box-shadow: 5px 6px 0 var(--ink), 0 12px 24px rgba(0,0,0,0.18);
      }
      .book-opened-spread::before,
      .book-silk-ribbon {
        display: none;
      }
      .spread-pages-grid {
        grid-template-columns: 1fr;
        border-radius: 6px;
      }
      .page-col-left {
        border-right: none;
        border-bottom: 2px dashed #ded3be;
        padding: 22px 18px 20px;
      }
      .page-col-right {
        padding: 20px 18px 22px;
      }
      .hero-book-title {
        font-size: 21px;
      }
      .btn-roll-header {
        padding: 6px 14px;
        font-size: 11.5px;
      }
    }
  </style>
</head>
<body>

  <!-- Atmospheric Environment Background -->
  <div class="library-env"></div>
  <div class="desk-surface"></div>

  <!-- Standard App Header Navigation -->
  <nav class="nav">
    <a class="logo" href="index.html">
      <span class="logo__mark">📕</span>
      <span>The<span class="logo__small">Small</span>Book</span>
    </a>
    <div class="nav__right-actions">
      <!-- Back to Library -->
      <a href="index.html#library" class="btn-header-link" title="Return to classic library">
        <span>📚 LIBRARY</span>
      </a>
      <!-- Close button visible when book is open -->
      <button type="button" class="btn-close-header" id="btnCloseHeader" title="Close book">
        <span>✕ CLOSE BOOK</span>
      </button>
      <!-- Roll another book -->
      <button type="button" class="btn-roll-header" id="btnRoll" title="Pick another random book from the library">
        <span class="btn-roll-dice" id="rollDice">🎲</span>
        <span>ROLL ANOTHER BOOK</span>
      </button>
    </div>
  </nav>

  <!-- Interactive Experience Container -->
  <main class="rnd-wrapper">
    
    <!-- =========================================================
         1. PHYSICAL 3D BOOKSHELF RACK
         ========================================================= -->
    <section class="bookshelf-unit" id="bookshelfUnit" aria-label="Physical 3D Bookshelf">
      
      <!-- Controls Bar: Category Filters & Physics Tools -->
      <div class="shelf-controls">
        <div class="shelf-filter-group" id="shelfFilters">
          <button type="button" class="shelf-pill active" data-cat="ALL">⭐ ALL BOOKS</button>
          <button type="button" class="shelf-pill" data-cat="ORIGINALS">📕 TSB ORIGINALS</button>
          <button type="button" class="shelf-pill" data-cat="DISRUPTORS">⚡ DISRUPTORS</button>
          <button type="button" class="shelf-pill" data-cat="CLASSICS">🧠 CLASSICS</button>
          <button type="button" class="shelf-pill" data-cat="WEALTH">💼 WEALTH &amp; MIND</button>
        </div>

        <div class="shelf-actions-right">
          <button type="button" class="shelf-tool-btn" id="btnKnockShelf" title="Knock a book off the shelf with gravity physics">
            <span>💥 KNOCK A BOOK</span>
          </button>
          <button type="button" class="shelf-tool-btn" id="btnToggleSound" title="Toggle audio effects">
            <span id="soundLabel">🔊 SOUND FX ON</span>
          </button>
        </div>
      </div>

      <!-- Wooden Shelf Cabinet with Books -->
      <div class="shelf-cabinet">
        <!-- Scroll navigation arrows -->
        <button type="button" class="shelf-arrow-btn shelf-arrow--left" id="shelfNavLeft" title="Scroll left">◀</button>
        <button type="button" class="shelf-arrow-btn shelf-arrow--right" id="shelfNavRight" title="Scroll right">▶</button>

        <!-- The Scrollable Track of Touchable Books -->
        <div class="shelf-track-container" id="shelfScrollContainer">
          <div class="shelf-books-row" id="shelfBooksRow">
            <div class="shelf-bookend">TSB</div>
            <!-- Dynamic Shelf Books Injected Here -->
            <div class="shelf-bookend">✦</div>
          </div>
        </div>

        <!-- Solid Walnut Shelf Plank -->
        <div class="shelf-plank"></div>
      </div>

    </section>

    <!-- =========================================================
         2. THE READING DESK (ACTIVE ROTATABLE 3D BOOK)
         ========================================================= -->
    <section class="desk-stage">
      
      <div class="rnd-hint-tag" id="hintTag">
        <span class="rnd-hint-dot"></span>
        <span id="hintText">Touch shelf books to pull and read · Drag desk book to rotate in 3D</span>
      </div>

      <!-- Quick Tools on Desk -->
      <div class="desk-tools-row">
        <button type="button" class="desk-pill-btn" id="btnDropDesk" title="Knock active book off the desk">
          <span>💨 KNOCK OFF DESK</span>
        </button>
        <button type="button" class="desk-pill-btn" id="btnDeskReRoll" title="Pick another random book">
          <span>🎲 PICK RANDOM</span>
        </button>
      </div>

      <!-- 3D Book Theater Viewport -->
      <div class="book-theater" id="bookTheater">
        
        <!-- The Physical 3D Book (Starts CLOSED, 360-rotatable) -->
        <div class="book-physical is-closed falling-from-shelf" id="bookPhysical">
          
          <!-- Ambient Floor Shadow -->
          <div class="book-shadow"></div>

          <!-- 3D Spine (Left Edge) -->
          <div class="book-spine-3d">
            <span>📕 TSB</span>
            <span class="book-spine-text" id="spineTitle">Title</span>
            <span>2026</span>
          </div>

          <!-- 3D Paper Thickness Edges (Right, Top, Bottom) -->
          <div class="book-pages-right"></div>
          <div class="book-pages-top"></div>
          <div class="book-pages-bottom"></div>

          <!-- 3D Back Cover -->
          <div class="book-back-cover">
            <div class="book-back-crest">
              <div style="font-size:24px;margin-bottom:6px;">📕</div>
              <div style="font-family:'Archivo Black',sans-serif;font-size:12px;letter-spacing:1px;">THESMALLBOOK</div>
              <div style="font-size:10px;color:#aaa;margin-top:4px;">Executive Library Edition</div>
            </div>
          </div>

          <!-- 3D FRONT COVER HINGE DOOR (Swings open 180deg upon click) -->
          <div class="book-cover-door" id="coverDoor">
            
            <!-- Front Side: Genuine Book Cover Art -->
            <div class="book-cover-front">
              <img id="coverImg" src="" alt="Book Cover">
            </div>

            <!-- Back Side: Inside Library Endpaper & Bookplate -->
            <div class="book-cover-inside">
              <div class="bookplate-box">
                <div class="bookplate-title">THESMALLBOOK</div>
                <div class="bookplate-sub">Library Edition · Free To Read</div>
                <div style="font-size:24px;margin:8px 0;">📕</div>
                <div style="font-size:10.5px;color:#888;">Executive Book Summary</div>
              </div>
            </div>

          </div>

          <!-- OPENED BOOK SPREAD (Revealed inside, 100% crisp) -->
          <div class="book-opened-spread">
            
            <!-- Silk Ribbon Marker -->
            <div class="book-silk-ribbon"></div>

            <!-- Crisp Pages Grid -->
            <article class="spread-pages-grid">
              
              <!-- LEFT PAGE: Identity, Big Idea & Core Lessons -->
              <section class="page-col-left">
                <div>
                  <div class="page-top-meta">
                    <span class="category-stamp" id="bookCategory">CATEGORY</span>
                    <span class="readtime-stamp" id="bookReadTime">8 MIN READ</span>
                  </div>

                  <h1 class="hero-book-title" id="bookTitle">Book Title</h1>
                  <div class="hero-book-author" id="bookAuthor">by Author · Year</div>

                  <div class="bigidea-box">
                    <div class="bigidea-header">💡 The Big Idea</div>
                    <p class="bigidea-content" id="bookBigIdea">Loading core summary...</p>
                  </div>

                  <div class="kicker-label">Core Lessons Inside</div>
                  <div class="lessons-container" id="bookLessonsContainer"></div>
                </div>

                <button type="button" class="btn-close-cover" id="btnCloseCover">
                  <span>📖 Close Book Cover</span>
                </button>
              </section>

              <!-- RIGHT PAGE: Quotes, Action Plan, Caveat & Action CTA -->
              <section class="page-col-right">
                <div>
                  <div class="quote-callout" id="bookQuote">
                    <span class="quote-glyph">“</span><span id="bookQuoteText">Quote here.</span>
                  </div>

                  <div class="kicker-label">5-Step Action Plan</div>
                  <div class="plan-container" id="bookActionPlan"></div>

                  <div class="caveat-callout" id="bookCaveat">
                    <b>Where advice breaks:</b> Specific domain caveat.
                  </div>
                </div>

                <div class="primary-cta-box">
                  <a href="#" class="btn-read-breakdown" id="btnReadFull">
                    <span>READ FULL BREAKDOWN (FREE)</span>
                    <span>&rarr;</span>
                  </a>
                </div>
              </section>

            </article>
          </div>

        </div>

      </div>

    </section>

    <!-- Clean Footer Note -->
    <div class="rnd-clean-footer">
      520 Curated Book Breakdowns · Zero Paywalls · Read in 8 Minutes
    </div>

  </main>

  <script src="./js/bootguard.js?v=323"></script>
  <script src="js/data.js?v=323"></script>
  <script>
    (function () {
      "use strict";

      var books = window.BOOKS || [];
      if (!books.length) {
        document.getElementById("bookTitle").textContent = "TheSmallBook Library";
        document.getElementById("btnReadFull").href = "index.html";
        return;
      }

      /* =========================================================
         PROCEDURAL WEB AUDIO SOUND ENGINE (Zero External Assets)
         ========================================================= */
      var SoundEngine = (function () {
        var ctx = null;
        var enabled = true;

        function init() {
          if (!ctx) {
            try {
              var AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (AudioCtx) ctx = new AudioCtx();
            } catch (e) {}
          }
          if (ctx && ctx.state === "suspended") {
            ctx.resume().catch(function () {});
          }
        }

        function playThud() {
          if (!enabled) return;
          init();
          if (!ctx) return;
          try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            var filter = ctx.createBiquadFilter();

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(260, now);
            filter.frequency.exponentialRampToValueAtTime(45, now + 0.18);

            osc.type = "triangle";
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(36, now + 0.18);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.2);
          } catch (e) {}
        }

        function playSlide() {
          if (!enabled) return;
          init();
          if (!ctx) return;
          try {
            var now = ctx.currentTime;
            var bufferSize = Math.floor(ctx.sampleRate * 0.11);
            var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
              data[i] = (Math.random() * 2 - 1) * 0.14;
            }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;

            var filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(900, now);
            filter.Q.setValueAtTime(2.2, now);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
          } catch (e) {}
        }

        function playTumble() {
          if (!enabled) return;
          init();
          if (!ctx) return;
          try {
            var delays = [0, 0.08, 0.17, 0.26];
            var freqs = [320, 240, 180, 130];
            var vols = [0.18, 0.14, 0.10, 0.06];

            delays.forEach(function (d, idx) {
              var now = ctx.currentTime + d;
              var osc = ctx.createOscillator();
              var gain = ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(freqs[idx], now);
              osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

              gain.gain.setValueAtTime(vols[idx], now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

              osc.connect(gain);
              gain.connect(ctx.destination);

              osc.start(now);
              osc.stop(now + 0.07);
            });
          } catch (e) {}
        }

        function playPageFlip() {
          if (!enabled) return;
          init();
          if (!ctx) return;
          try {
            var now = ctx.currentTime;
            var bufferSize = Math.floor(ctx.sampleRate * 0.14);
            var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) {
              data[i] = (Math.random() * 2 - 1) * 0.1;
            }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;

            var filter = ctx.createBiquadFilter();
            filter.type = "highpass";
            filter.frequency.setValueAtTime(1700, now);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
          } catch (e) {}
        }

        return {
          init: init,
          playThud: playThud,
          playSlide: playSlide,
          playTumble: playTumble,
          playPageFlip: playPageFlip,
          toggle: function () {
            enabled = !enabled;
            return enabled;
          },
          isEnabled: function () {
            return enabled;
          }
        };
      })();

      /* =========================================================
         DESK ROTATABLE BOOK ELEMENTS
         ========================================================= */
      var bookPhysical = document.getElementById("bookPhysical");
      var coverImg = document.getElementById("coverImg");
      var spineTitle = document.getElementById("spineTitle");
      var bookCategory = document.getElementById("bookCategory");
      var bookTitle = document.getElementById("bookTitle");
      var bookAuthor = document.getElementById("bookAuthor");
      var bookBigIdea = document.getElementById("bookBigIdea");
      var bookLessonsContainer = document.getElementById("bookLessonsContainer");
      var bookQuoteText = document.getElementById("bookQuoteText");
      var bookActionPlan = document.getElementById("bookActionPlan");
      var bookCaveat = document.getElementById("bookCaveat");
      var bookReadTime = document.getElementById("bookReadTime");
      var btnReadFull = document.getElementById("btnReadFull");
      var btnCloseCover = document.getElementById("btnCloseCover");
      var btnCloseHeader = document.getElementById("btnCloseHeader");
      var btnRoll = document.getElementById("btnRoll");
      var rollDice = document.getElementById("rollDice");
      var hintText = document.getElementById("hintText");
      var btnDropDesk = document.getElementById("btnDropDesk");
      var btnDeskReRoll = document.getElementById("btnDeskReRoll");

      /* Bookshelf elements */
      var shelfBooksRow = document.getElementById("shelfBooksRow");
      var shelfScrollContainer = document.getElementById("shelfScrollContainer");
      var shelfNavLeft = document.getElementById("shelfNavLeft");
      var shelfNavRight = document.getElementById("shelfNavRight");
      var btnKnockShelf = document.getElementById("btnKnockShelf");
      var btnToggleSound = document.getElementById("btnToggleSound");
      var soundLabel = document.getElementById("soundLabel");
      var shelfFilters = document.getElementById("shelfFilters");

      var currentBook = null;

      // 3D Rotation State for Closed Desk Book
      var rotY = -20;
      var rotX = 10;
      var isDragging = false;
      var startX = 0;
      var startY = 0;
      var dragDistance = 0;

      function update3DTransform() {
        if (!bookPhysical || bookPhysical.classList.contains("is-open")) return;
        bookPhysical.style.transform = "rotateY(" + rotY + "deg) rotateX(" + rotX + "deg)";
      }

      function pickRandomBook() {
        var idx = Math.floor(Math.random() * books.length);
        return books[idx];
      }

      function preloadCoverImage(src, callback) {
        if (!src) {
          if (callback) callback();
          return;
        }
        var img = new Image();
        img.onload = function () {
          if (callback) callback();
        };
        img.onerror = function () {
          if (callback) callback();
        };
        img.src = src;
      }

      function populateBook(b) {
        currentBook = b;
        document.title = b.title + " | TheSmallBook 3D Shelf";

        var coverSrc = String(b.cover || "").replace(/^\//, "");
        if (coverImg) {
          coverImg.src = coverSrc;
          coverImg.alt = b.title;
        }

        if (spineTitle) spineTitle.textContent = b.title;
        if (bookCategory) bookCategory.textContent = "✦ " + (b.category || "NON-FICTION").toUpperCase();
        if (bookTitle) bookTitle.textContent = b.title;
        if (bookAuthor) bookAuthor.textContent = "by " + b.author + (b.year ? " · " + b.year : "");
        if (bookBigIdea) bookBigIdea.textContent = b.bigIdea || b.oneLiner || "Essence of this breakthrough work.";

        // Lessons (first 2 core lessons for preview spread)
        if (bookLessonsContainer) {
          bookLessonsContainer.innerHTML = "";
          var previewLessons = (b.lessons || []).slice(0, 2);
          previewLessons.forEach(function (l) {
            var el = document.createElement("div");
            el.className = "lesson-item-box";
            el.innerHTML = "<span class='lesson-item-title'>" + (l.title || "Lesson") + ":</span> <span class='lesson-item-summary'>" + (l.summary || "") + "</span>";
            bookLessonsContainer.appendChild(el);
          });
        }

        // Quote
        if (bookQuoteText) {
          var q = (b.quotes && b.quotes[0]) ? b.quotes[0] : (b.oneLiner || "");
          bookQuoteText.textContent = q;
        }

        // 5-Step Action Plan
        if (bookActionPlan) {
          bookActionPlan.innerHTML = "";
          var steps = (b.actionPlan || []).slice(0, 4);
          steps.forEach(function (step, i) {
            var stepRow = document.createElement("div");
            stepRow.className = "plan-step-row";
            stepRow.innerHTML = "<span class='plan-step-num'>" + (i + 1) + "</span><span>" + step + "</span>";
            bookActionPlan.appendChild(stepRow);
          });
        }

        // Caveat
        if (bookCaveat) {
          bookCaveat.innerHTML = "<b>Where advice breaks:</b> " + (b.caveat || "Apply contextually to your specific domain.");
        }

        if (bookReadTime) {
          bookReadTime.textContent = "⏱ " + (b.readTime || "8 min") + " READ";
        }

        // Action URL
        if (btnReadFull) {
          btnReadFull.href = "book.html?id=" + encodeURIComponent(b.id) + "&from=shelf3d";
        }
      }

      function openBook() {
        if (!bookPhysical) return;
        bookPhysical.classList.remove("is-closed");
        bookPhysical.classList.add("is-open");
        bookPhysical.style.transform = "rotateY(0deg) rotateX(0deg)";
        if (btnCloseHeader) btnCloseHeader.style.display = "inline-flex";
        if (hintText) hintText.textContent = "Book open · Read core summary below";
        SoundEngine.playPageFlip();
      }

      function closeBook() {
        if (!bookPhysical) return;
        bookPhysical.classList.remove("is-open");
        bookPhysical.classList.add("is-closed");
        rotY = -20;
        rotX = 10;
        update3DTransform();
        if (btnCloseHeader) btnCloseHeader.style.display = "none";
        if (hintText) hintText.textContent = "Touch shelf books to pull and read · Drag desk book to rotate in 3D";
        SoundEngine.playPageFlip();
      }

      /* =========================================================
         PHYSICAL DESK TRANSITION: PULL OR ROLL BOOK ONTO DESK
         ========================================================= */
      function transitionBookOntoDesk(nextBook, pulledElement) {
        if (!bookPhysical || !nextBook) return;

        // If open, close immediately
        if (bookPhysical.classList.contains("is-open")) {
          closeBook();
        }

        // Preload next book cover
        var nextCover = String(nextBook.cover || "").replace(/^\//, "");

        // Step 1: Animate picked book from shelf (if clicked from shelf)
        if (pulledElement) {
          pulledElement.classList.add("is-picked");
          SoundEngine.playSlide();
        }

        // Step 2: Desk book tumbles down and off the desk
        setTimeout(function () {
          bookPhysical.classList.remove("falling-from-shelf");
          bookPhysical.classList.add("falling-down");
          SoundEngine.playTumble();

          preloadCoverImage(nextCover, function () {
            setTimeout(function () {
              populateBook(nextBook);

              // Step 3: New book drops down onto the desk from the shelf above
              bookPhysical.classList.remove("falling-down");
              bookPhysical.classList.add("falling-from-shelf");

              rotY = -20;
              rotX = 10;

              SoundEngine.playThud();

              if (pulledElement) {
                setTimeout(function () {
                  pulledElement.classList.remove("is-picked");
                }, 400);
              }
            }, 260);
          });
        }, 140);
      }

      /* =========================================================
         BUILD THE PHYSICAL 3D BOOKSHELF
         ========================================================= */
      var SPINE_COLORS = [
        { bg: "linear-gradient(to right, #6b1414, #8b1e1e, #500f0f)", text: "#ffebad" }, // Burgundy
        { bg: "linear-gradient(to right, #123e27, #1e5b3a, #0b2819)", text: "#c3e6cb" }, // Emerald
        { bg: "linear-gradient(to right, #122238, #1d3557, #0b1523)", text: "#d0e2ff" }, // Navy
        { bg: "linear-gradient(to right, #804305, #a35607, #5c2f02)", text: "#ffe0b2" }, // Saffron
        { bg: "linear-gradient(to right, #3d2411, #5c3a21, #2b1709)", text: "#f5d6ba" }, // Leather
        { bg: "linear-gradient(to right, #2b1233, #431d4f, #1b0a20)", text: "#e8c5f5" }, // Plum
        { bg: "linear-gradient(to right, #1d2022, #2d3235, #121415)", text: "#e2e8f0" }, // Charcoal
        { bg: "linear-gradient(to right, #7a5e12, #997718, #594409)", text: "#fff3bf" }  // Ochre
      ];

      var shelfCuratedList = [];

      function buildShelfBooks(filterCat) {
        if (!shelfBooksRow) return;

        // Clear existing books (preserve bookends)
        shelfBooksRow.innerHTML = "<div class='shelf-bookend'>TSB</div>";

        var filtered = books;
        if (filterCat && filterCat !== "ALL") {
          filtered = books.filter(function (b) {
            var c = (b.category || "").toUpperCase();
            if (filterCat === "ORIGINALS") return (b.author || "").includes("TheSmallBook") || (b.category || "").includes("ORIGINAL") || (window.TSB_CONFIG && (TSB_CONFIG.ORIGINALS || []).indexOf(b.id) !== -1);
            if (filterCat === "DISRUPTORS") return c.includes("INDIAN") || c.includes("DISRUPTOR") || c.includes("BUSINESS") || c.includes("STARTUP");
            if (filterCat === "CLASSICS") return c.includes("CLASSIC") || c.includes("PHILOSOPHY") || c.includes("WISDOM");
            if (filterCat === "WEALTH") return c.includes("WEALTH") || c.includes("MONEY") || c.includes("INVESTING") || c.includes("PSYCHOLOGY");
            return true;
          });
        }

        // Take a vibrant cross-section of up to 34 books
        var shelfItems = filtered.slice(0, 34);
        shelfCuratedList = shelfItems;

        shelfItems.forEach(function (b, idx) {
          var color = SPINE_COLORS[idx % SPINE_COLORS.length];
          // Organically vary height (156px to 192px) and width (23px to 34px)
          var height = 156 + ((b.title.length * 7) % 36);
          var width = 23 + ((b.lessons ? b.lessons.length * 2 : 10) % 12);

          var bookEl = document.createElement("div");
          bookEl.className = "shelf-book";
          bookEl.style.height = height + "px";
          bookEl.style.width = width + "px";
          bookEl.dataset.id = b.id;
          bookEl.dataset.idx = idx;

          // Realistic spine HTML with cylindrical highlight, embossed ribs, and vertical title
          bookEl.innerHTML =
            "<div class='shelf-book-tooltip'>" +
              "<div class='shelf-tooltip-cat'>" + (b.category || "Curated") + "</div>" +
              "<div class='shelf-tooltip-title'>" + b.title + "</div>" +
              "<div class='shelf-tooltip-sub'>by " + b.author + " · <b>Tap to read</b></div>" +
            "</div>" +
            "<div class='shelf-book-spine' style='background:" + color.bg + ";color:" + color.text + ";'>" +
              "<div style='font-size:10px;line-height:1;margin-bottom:2px;'>📕</div>" +
              "<div class='shelf-spine-rib rib-1'></div>" +
              "<div class='shelf-spine-rib rib-2'></div>" +
              "<div class='shelf-spine-rib rib-3'></div>" +
              "<div class='shelf-spine-rib rib-4'></div>" +
              "<div class='shelf-spine-title' style='color:" + color.text + ";'>" + b.title + "</div>" +
              "<div class='shelf-spine-author'>" + (b.author ? b.author.split(" ").pop() : "") + "</div>" +
            "</div>";

          // Interactivity: Hover & Tap to pick
          bookEl.addEventListener("mouseenter", function () {
            SoundEngine.playSlide();
          });

          bookEl.addEventListener("click", function (e) {
            e.stopPropagation();
            transitionBookOntoDesk(b, bookEl);
            try { if (navigator.vibrate) navigator.vibrate(25); } catch (err) {}
          });

          shelfBooksRow.appendChild(bookEl);
        });

        // Add closing bookend
        var endBookend = document.createElement("div");
        endBookend.className = "shelf-bookend";
        endBookend.textContent = "✦";
        shelfBooksRow.appendChild(endBookend);
      }

      buildShelfBooks("ALL");

      // Shelf Category Filter Tabs
      if (shelfFilters) {
        shelfFilters.addEventListener("click", function (e) {
          var target = e.target.closest(".shelf-pill");
          if (!target) return;
          var cat = target.dataset.cat || "ALL";
          shelfFilters.querySelectorAll(".shelf-pill").forEach(function (p) { p.classList.remove("active"); });
          target.classList.add("active");
          buildShelfBooks(cat);
          SoundEngine.playSlide();
        });
      }

      // Shelf Horizontal Scrolling Buttons
      if (shelfNavLeft && shelfScrollContainer) {
        shelfNavLeft.addEventListener("click", function () {
          shelfScrollContainer.scrollBy({ left: -260, behavior: "smooth" });
          SoundEngine.playSlide();
        });
      }
      if (shelfNavRight && shelfScrollContainer) {
        shelfNavRight.addEventListener("click", function () {
          shelfScrollContainer.scrollBy({ left: 260, behavior: "smooth" });
          SoundEngine.playSlide();
        });
      }

      // KNOCK A BOOK FROM SHELF (Interactive falling physics!)
      if (btnKnockShelf) {
        btnKnockShelf.addEventListener("click", function () {
          var shelfBooks = shelfBooksRow ? shelfBooksRow.querySelectorAll(".shelf-book:not(.is-falling):not(.is-picked)") : [];
          if (!shelfBooks.length) return;
          // Pick a random book or the one on the edge to topple
          var targetIdx = Math.floor(Math.random() * Math.min(10, shelfBooks.length));
          var bookToTopple = shelfBooks[targetIdx];
          if (!bookToTopple) return;

          bookToTopple.classList.add("is-falling");
          SoundEngine.playTumble();
          try { if (navigator.vibrate) navigator.vibrate([15, 30, 45]); } catch (err) {}

          setTimeout(function () {
            SoundEngine.playThud();
          }, 450);

          // Restore book back to shelf after 1.8 seconds
          setTimeout(function () {
            bookToTopple.classList.remove("is-falling");
          }, 1800);
        });
      }

      // Toggle Sound FX
      if (btnToggleSound && soundLabel) {
        btnToggleSound.addEventListener("click", function () {
          var on = SoundEngine.toggle();
          soundLabel.textContent = on ? "🔊 SOUND FX ON" : "🔇 SOUND FX OFF";
        });
      }

      // Initial populate for Desk Book
      var initial = pickRandomBook();
      var initialCover = String(initial.cover || "").replace(/^\//, "");
      preloadCoverImage(initialCover, function () {
        populateBook(initial);
        update3DTransform();
      });

      // Pointer event handlers for 360-degree rotation of Desk Book
      if (bookPhysical) {
        bookPhysical.addEventListener("pointerdown", function (e) {
          if (bookPhysical.classList.contains("is-open")) return;
          isDragging = true;
          dragDistance = 0;
          startX = e.clientX;
          startY = e.clientY;
          SoundEngine.init();
          try { bookPhysical.setPointerCapture(e.pointerId); } catch (err) {}
        });

        window.addEventListener("pointermove", function (e) {
          if (!isDragging || bookPhysical.classList.contains("is-open")) return;
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          dragDistance += Math.abs(dx) + Math.abs(dy);
          startX = e.clientX;
          startY = e.clientY;

          // Horizontal drag rotates Y axis (360 degrees)
          rotY += dx * 0.75;
          // Vertical drag tilts X axis (-35 to +35 degrees)
          rotX = Math.max(-35, Math.min(35, rotX - dy * 0.5));

          update3DTransform();
        });

        window.addEventListener("pointerup", function (e) {
          if (!isDragging) return;
          isDragging = false;
          try { bookPhysical.releasePointerCapture(e.pointerId); } catch (err) {}

          // Quick tap with minimal movement (< 6px) opens the book!
          if (dragDistance < 6 && bookPhysical.classList.contains("is-closed")) {
            openBook();
            try { if (navigator.vibrate) navigator.vibrate(20); } catch (err) {}
          }
        });
      }

      // Close book button on inside left page
      if (btnCloseCover) {
        btnCloseCover.addEventListener("click", function (e) {
          e.stopPropagation();
          closeBook();
          try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
        });
      }

      // Close button in header
      if (btnCloseHeader) {
        btnCloseHeader.addEventListener("click", function (e) {
          e.stopPropagation();
          closeBook();
          try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
        });
      }

      // ROLL ANOTHER BOOK (Header button): Pick random, drops old with gravity, drops new from shelf
      function handleRoll() {
        if (!bookPhysical) return;
        try { if (navigator.vibrate) navigator.vibrate([20, 30, 20]); } catch (err) {}

        if (btnRoll) btnRoll.disabled = true;
        if (rollDice) rollDice.style.transform = "rotate(360deg)";

        var next = pickRandomBook();
        transitionBookOntoDesk(next, null);

        setTimeout(function () {
          if (rollDice) rollDice.style.transform = "rotate(0deg)";
          if (btnRoll) btnRoll.disabled = false;
        }, 700);
      }

      if (btnRoll) {
        btnRoll.addEventListener("click", handleRoll);
      }
      if (btnDeskReRoll) {
        btnDeskReRoll.addEventListener("click", handleRoll);
      }

      // KNOCK ACTIVE BOOK OFF DESK
      if (btnDropDesk) {
        btnDropDesk.addEventListener("click", function () {
          if (!bookPhysical) return;
          try { if (navigator.vibrate) navigator.vibrate([20, 40]); } catch (err) {}
          if (bookPhysical.classList.contains("is-open")) {
            closeBook();
          }
          bookPhysical.classList.remove("falling-from-shelf");
          bookPhysical.classList.add("falling-down");
          SoundEngine.playTumble();

          setTimeout(function () {
            SoundEngine.playThud();
          }, 380);

          // Return new book to desk after 1 second
          setTimeout(function () {
            var next = pickRandomBook();
            populateBook(next);
            bookPhysical.classList.remove("falling-down");
            bookPhysical.classList.add("falling-from-shelf");
            rotY = -20;
            rotX = 10;
            SoundEngine.playThud();
          }, 1000);
        });
      }

    })();
  </script>
</body>
</html>
"""

# Check for em and en dashes
if "\u2014" in content or "\u2013" in content:
    print("ERROR: em or en dash detected in content!")
    sys.exit(1)

with open("random.html", "w", encoding="utf-8") as f:
    f.write(content)

print("random.html successfully written, length:", len(content))
