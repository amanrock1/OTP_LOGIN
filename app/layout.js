import './globals.css';

export const metadata = {
  title: 'Secure Email OTP Login',
  description: 'Production-ready serverless Email OTP authentication system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
