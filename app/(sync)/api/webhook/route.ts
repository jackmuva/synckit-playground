import { NextRequest } from "next/server";
import { createActivity, getSyncTriggerByUserIdAndSource } from "@/db/queries";
import { SignJWT } from "jose";
import { importPrivateKey } from "@/app/(auth)/auth";

interface SyncWebhook {
	event: string,
	sync: string,
	user: { id: string },
	data: {
		model: string,
		synced_at: string,
		num_records: number
	},
}

export async function POST(request: NextRequest) {
	const body: SyncWebhook = await request.json();

	try {
		const response = await createActivity({
			event: body.event,
			source: body.sync,
			// TODO: Check that synced_at is the time of webhook OR time of initial sync
			receivedAt: new Date(body.data.synced_at),
			data: JSON.stringify(body.data),
			userId: body.user.id
		});
		console.log(`[WEBHOOK] successfully logged activity ${response}`);
	} catch (error) {
		console.error("[WEBHOOK] failed to create activity");
		throw error;
	}

	try {
		// HACK: for multiple syncs, a better way to get sync id may be 
		// to use the synced_at field if it refers to the initial sync
		const syncTrigger = await getSyncTriggerByUserIdAndSource({ id: body.user.id, source: body.sync });
		if (syncTrigger.length === 0) {
			return Response.json({
				message: `could not find trigger by this source: ${body.sync}`
			});
		}
		const jwt = await signJwt(body.user.id);
		if (!process.env.SYNC_BACKGROUND_WORKER_URL) {
			console.error("[WEBHOOK] set SYNC_BACKGROUND_WORKER_URL");
			return Response.json({
				message: `no sync background worker`
			});
		}
		const workerRequest = await fetch(process.env.SYNC_BACKGROUND_WORKER_URL, {
			method: "POST",
			headers: { Authorization: `Bearer ${jwt}` },
			body: JSON.stringify(syncTrigger),
		});
		const workerResponse = await workerRequest.json();
		return Response.json(workerResponse);
	} catch (error) {
		console.error("[WEBHOOK] failed to send to worker");
		throw error;
	}



}

const signJwt = async (userId: string): Promise<string> => {
	const PRIVATE_KEY = await importPrivateKey(process.env.PARAGON_SIGNING_KEY!);
	const paragonUserToken = await new SignJWT({
		sub: userId,
	})
		.setProtectedHeader({ alg: "RS256" })
		.setIssuedAt()
		.setExpirationTime("60m")
		.sign(PRIVATE_KEY);
	return paragonUserToken;

}
