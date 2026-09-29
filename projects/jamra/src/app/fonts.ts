import { Rubik } from 'next/font/google';

/** Rubik covers Arabic, Hebrew and Latin in one family. */
export const rubik = Rubik({
  subsets: ['arabic', 'hebrew', 'latin'],
  weight: ['400', '500', '700', '800'],
  display: 'swap',
  variable: '--font-rubik',
});
