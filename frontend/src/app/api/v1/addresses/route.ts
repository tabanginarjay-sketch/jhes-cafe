import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { getCanonicalCustomer } from "@/lib/customerPersistence";
import {
  deleteCustomerAddress,
  listCustomerAddresses,
  saveCustomerAddress,
} from "@/lib/deliveryStore";

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { detail: "Authentication required to access saved addresses." },
      { status: 401 }
    );
  }

  try {
    const canonical = await getCanonicalCustomer(user.email, user.name);
    const addresses = await listCustomerAddresses(canonical.id, canonical.email);
    return NextResponse.json(
      { addresses },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to load saved addresses." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { detail: "Authentication required to save a delivery address." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const recipientName = String(body.recipient_name || user.name || "").trim();
    const contactNumber = String(body.contact_number || "").trim();
    const houseNumber = String(body.house_number || "").trim();
    const street = String(body.street || "").trim();
    const barangay = String(body.barangay || "").trim();
    const city = String(body.city || "").trim();
    const landmark = String(body.landmark || "").trim();
    const deliveryInstructions = String(body.delivery_instructions || "").trim().slice(0, 240);
    const label = String(body.label || "Home").trim().slice(0, 40);

    if (!recipientName || !contactNumber || !houseNumber || !street || !barangay || !city) {
      return NextResponse.json(
        {
          detail:
            "Recipient name, contact number, house/building number, street, barangay, and city are required.",
        },
        { status: 400 }
      );
    }

    const canonical = await getCanonicalCustomer(user.email, user.name);
    const saved = await saveCustomerAddress({
      customer_id: canonical.id,
      customer_email: canonical.email,
      label,
      recipient_name: recipientName,
      contact_number: contactNumber,
      house_number: houseNumber,
      street,
      barangay,
      city,
      landmark,
      delivery_instructions: deliveryInstructions,
      is_default: Boolean(body.is_default),
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to save address." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ detail: "Address id is required." }, { status: 400 });
    }
    const canonical = await getCanonicalCustomer(user.email, user.name);
    const deleted = await deleteCustomerAddress(id, canonical.id, canonical.email);
    if (!deleted) {
      return NextResponse.json({ detail: "Address not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to delete address." },
      { status: 500 }
    );
  }
}
