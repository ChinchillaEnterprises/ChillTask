'use client';

import { Inter } from 'next/font/google';
import { createTheme, PaletteOptions } from '@mui/material/styles';

const inter = Inter({
  weight: ['100', '200', '300', '400', '500', '700', '800', '900',],
  subsets: ['latin'],
  display: 'swap',
});

interface CustomPaletteOptions extends PaletteOptions {
  orange: {
    main: string;
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };
  purple: {
    main: string;
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };
}

const theme = createTheme({
  palette: {
    background: {
      default: "#ffffff"  // Clean white background
    },
    text:{
      primary: "#3A3A3A"  // Darker, more readable
    },
    primary: {
      main: "#9333ea",  // Purple - modern, creative
      50: "#faf5ff",
      100: "#f3e8ff",
      400: "#a855f7",
      500: "#9333ea",
      600: "#7e22ce",
      700: "#6b21a8",
      800: "#581c87",
    },
    secondary: {
      main: "#D4A574",  // Warm clay - approachable, grounded
      100: "#F5E6D3",
      400: "#D4A574",
      500: "#C19553",
    },
    success: {
      main: "#87A96B",  // Sage green - natural, positive
      50: "#F1F4ED",
      100: "#E3E9DB",
      300: "#B3C4A0",
      400: "#9DB584",
      500: "#87A96B",
      600: "#6B8E4E",
      700: "#4F6B38",
    },
    info: {
      main: "#4A6FA5",  // Slate blue - professional, trustworthy
      100: "#E3EBF4",
      400: "#6B89B8",
      500: "#4A6FA5",
    },
    warning: {
      main: "#E8B04B",  // Muted gold - less aggressive
      50: "#FFF8E7",
      100: "#FFE9B8",
      500: "#E8B04B",
      600: "#D4983C",
    },
    error: {
      main: "#CC5500",  // Terracotta - urgent but warm
      40: "#FFD4B8",
      50: "#FFE8DD",
      100: "#FFD4B8",
      150: "#E8A57D",
      200: "#E89F6C",
      300: "#D97A3A",
      500: "#CC5500",
      600: "#B84A00",
      700: "#9C3F00",
    },
    grey: {
      50: '#f6f7f9',
      100: '#eceef2',
      300: '#b1bbc8',
      400: '#9497aa',
    },
    orange: {
      main: '#fe7a36', 
      50: '#fff2f0',
      100: '#ffe8d4',
      500: '#fd5812',
      600: '#ec1f00',
      700: '#c52b09',
    },
    purple: {
      main: '#ad63f6',  
      50: '#faf5ff',  
      100: '#f3e8ff',  
      500: '#ad63f6',  
      600: '#9135e8',  
      700: '#7c24cc',  
    }
  } as CustomPaletteOptions,
  typography: {
    fontFamily: inter.style.fontFamily, 
    fontSize: 12.3,
  },
});

export default theme;
