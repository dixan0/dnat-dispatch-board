import "./globals.css";

export const metadata = {
title: "DMAT Dispatch Board",
description: "Dispatch Board",
};

export default function RootLayout({ children }) {
return (
<html lang="en" suppressHydrationWarning>
<body suppressHydrationWarning>{children}</body>
</html>
);
}