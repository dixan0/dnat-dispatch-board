import "./globals.css";
import PinGate from "@/components/PinGate";

export const metadata = {
title: "DMAT Dispatch Board",
description: "Dispatch Board",
};

export default function RootLayout({ children }) {
return (
<html lang="en" suppressHydrationWarning>
<body suppressHydrationWarning>
<PinGate>{children}</PinGate>
</body>
</html>
);
}