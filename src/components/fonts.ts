import { Inter, Lusitana } from "next/font/google";

export const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

export const lusitana = Lusitana({ 
  subsets: ["latin"], 
  weight: ["400", "700"],
  display: 'swap',
  preload: true,
});