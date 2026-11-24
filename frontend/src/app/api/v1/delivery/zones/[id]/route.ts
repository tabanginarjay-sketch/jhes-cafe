import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/serverAuth";
import { deleteDeliveryZone, updateDeliveryZone } from "@/lib/deliveryStore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.delivery_fee !== undefined) {
      const fee = Number(body.delivery_fee);
      if (!Number.isFinite(fee) || fee < 0 || fee > 2000) {
        return NextResponse.json(
          { detail: "Delivery fee must be between 0 and 2000 PHP." },
          { status: 400 }
        );
      }
    }
    if (body.min_order_amount !== undefined) {
      const minOrd = Number(body.min_order_amount);
      if (!Number.isFinite(minOrd) || minOrd < 0 || minOrd > 10000) {
        return NextResponse.json(
          { detail: "Minimum order amount must be non-negative." },
          { status: 400 }
        );
      }
    }

    const updated = await updateDeliveryZone(id, {
      ...(body.city !== undefined ? { city: String(body.city) } : {}),
      ...(body.barangay !== undefined ? { barangay: String(body.barangay) } : {}),
      ...(body.area_label !== undefined ? { area_label: String(body.area_label) } : {}),
      ...(body.delivery_fee !== undefined ? { delivery_fee: Number(body.delivery_fee) } : {}),
      ...(body.min_order_amount !== undefined ? { min_order_amount: Number(body.min_order_amount) } : {}),
      ...(body.estimated_minutes !== undefined ? { estimated_minutes: String(body.estimated_minutes) } : {}),
      ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
      updated_by: admin.name,
    });

    if (!updated) {
      return NextResponse.json({ detail: "Delivery zone not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to update delivery zone." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { detail: "Administrator authentication required." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const deleted = await deleteDeliveryZone(id);
    if (!deleted) {
      return NextResponse.json({ detail: "Delivery zone not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to delete delivery zone." },
      { status: 500 }
    );
  }
}
