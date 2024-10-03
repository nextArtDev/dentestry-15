import Navbar from '@/components/Home/Navbar'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className=" ">
      <Navbar />
      {children}
    </main>
  )
}
