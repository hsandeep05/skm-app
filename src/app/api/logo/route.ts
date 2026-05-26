import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/logo - Get the shop logo
export async function GET() {
  try {
    const setting = await db.setting.findUnique({ where: { key: 'shopLogo' } })
    return NextResponse.json({ logo: setting?.value || null })
  } catch (error) {
    console.error('Get logo error:', error)
    return NextResponse.json({ logo: null }, { status: 500 })
  }
}

// POST /api/logo - Save the shop logo (base64)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { logo } = body

    if (!logo) {
      return NextResponse.json({ error: 'Logo data is required' }, { status: 400 })
    }

    // Upsert the logo setting
    await db.setting.upsert({
      where: { key: 'shopLogo' },
      update: { value: logo },
      create: { key: 'shopLogo', value: logo },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save logo error:', error)
    return NextResponse.json({ error: 'Failed to save logo' }, { status: 500 })
  }
}

// DELETE /api/logo - Remove the shop logo
export async function DELETE() {
  try {
    await db.setting.deleteMany({ where: { key: 'shopLogo' } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete logo error:', error)
    return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 })
  }
}
