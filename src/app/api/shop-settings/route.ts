import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/shop-settings - Get shop name, address, tagline
export async function GET() {
  try {
    const [nameSetting, addressSetting, taglineSetting] = await Promise.all([
      db.setting.findUnique({ where: { key: 'shopName' } }),
      db.setting.findUnique({ where: { key: 'shopAddress' } }),
      db.setting.findUnique({ where: { key: 'shopTagline' } }),
    ])

    return NextResponse.json({
      shopName: nameSetting?.value || 'SRI Krishna Mobiles',
      shopAddress: addressSetting?.value || 'Near Chowk bazar, MainRoad, Narayanpet',
      shopTagline: taglineSetting?.value || 'Your Trusted Mobile Service Center',
    })
  } catch (error) {
    console.error('Get shop settings error:', error)
    return NextResponse.json({
      shopName: 'SRI Krishna Mobiles',
      shopAddress: 'Near Chowk bazar, MainRoad, Narayanpet',
      shopTagline: 'Your Trusted Mobile Service Center',
    }, { status: 500 })
  }
}

// POST /api/shop-settings - Save shop name, address, tagline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shopName, shopAddress, shopTagline } = body

    const updates = []
    if (shopName !== undefined) {
      updates.push(
        db.setting.upsert({
          where: { key: 'shopName' },
          update: { value: shopName },
          create: { key: 'shopName', value: shopName },
        })
      )
    }
    if (shopAddress !== undefined) {
      updates.push(
        db.setting.upsert({
          where: { key: 'shopAddress' },
          update: { value: shopAddress },
          create: { key: 'shopAddress', value: shopAddress },
        })
      )
    }
    if (shopTagline !== undefined) {
      updates.push(
        db.setting.upsert({
          where: { key: 'shopTagline' },
          update: { value: shopTagline },
          create: { key: 'shopTagline', value: shopTagline },
        })
      )
    }

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save shop settings error:', error)
    return NextResponse.json({ error: 'Failed to save shop settings' }, { status: 500 })
  }
}
