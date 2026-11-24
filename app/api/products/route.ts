import { MongoClient, ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>
}

async function productsCollection() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not configured')

  globalForMongo.mongoClientPromise ??= new MongoClient(uri).connect()
  const client = await globalForMongo.mongoClientPromise
  return client.db('hg_store').collection('products')
}

function isAdmin(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD
  const provided = request.headers.get('x-admin-password')
  return Boolean(expected && provided && provided === expected)
}

function unavailable() {
  return NextResponse.json(
    { error: 'تعذر الاتصال بقاعدة البيانات' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.has('auth')) {
      return NextResponse.json(
        { ok: isAdmin(request) },
        {
          status: isAdmin(request) ? 200 : 401,
          headers: { 'Cache-Control': 'no-store' },
        },
      )
    }

    const collection = await productsCollection()
    const products = await collection
      .find(
        {},
        { projection: { name: 1, price: 1, category: 1, desc: 1, images: 1, image: 1, available: 1 } },
      )
      .sort({ _id: -1 })
      .toArray()

    return NextResponse.json(products, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return unavailable()
  }
}

export async function POST(request: NextRequest) {
  return mutate(request, 'insert')
}

export async function PUT(request: NextRequest) {
  return mutate(request, 'update')
}

export async function DELETE(request: NextRequest) {
  return mutate(request, 'delete')
}

async function mutate(request: NextRequest, action: 'insert' | 'update' | 'delete') {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const collection = await productsCollection()

    if (action === 'delete' || action === 'update') {
      if (typeof data.id !== 'string' || !ObjectId.isValid(data.id)) {
        return NextResponse.json({ error: 'معرّف المنتج غير صالح' }, { status: 400 })
      }
    }

    if (action === 'delete') {
      return NextResponse.json(await collection.deleteOne({ _id: new ObjectId(data.id as string) }))
    }

    const categories = [
      'غسالات',
      'تلاجات',
      'بوتوجازات',
      'أطقم سفرة',
      'أطقم حلل',
      'كاسات',
      'كوبايات',
    ]
    const imageList = Array.isArray(data.images) ? data.images : []
    const images = imageList
      .slice(0, 5)
      .filter((image): image is string => typeof image === 'string')
      .map((image) => image.slice(0, 300_000))

    const product = {
      name: typeof data.name === 'string' ? data.name.trim().slice(0, 120) : '',
      price: Number.isFinite(Number(data.price)) && Number(data.price) >= 0 ? Number(data.price) : 0,
      category: categories.includes(String(data.category)) ? String(data.category) : categories[0],
      desc: typeof data.desc === 'string' ? data.desc.slice(0, 500) : '',
      images,
      image: images[0] ?? '',
      available: data.available !== false,
    }

    if (!product.name) {
      return NextResponse.json({ error: 'اسم المنتج مطلوب' }, { status: 400 })
    }

    if (action === 'update') {
      return NextResponse.json(
        await collection.updateOne({ _id: new ObjectId(data.id as string) }, { $set: product }),
      )
    }

    return NextResponse.json(await collection.insertOne(product), { status: 201 })
  } catch {
    return unavailable()
  }
}
