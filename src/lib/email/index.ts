import nodemailer from "nodemailer";

interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
}

function createSmtpTransport() {
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST || "localhost",
		port: Number(process.env.SMTP_PORT) || 1025,
		secure: process.env.SMTP_SECURE === "true",
		...(process.env.SMTP_USER && process.env.SMTP_PASS
			? {
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASS,
					},
				}
			: {}),
	});
}

async function sendViaResend(options: SendEmailOptions): Promise<void> {
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: process.env.SMTP_FROM || "noreply@lanyard.local",
			to: options.to,
			subject: options.subject,
			html: options.html,
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Resend API error: ${res.status} ${body}`);
	}
}

async function sendViaSmtp(options: SendEmailOptions): Promise<void> {
	const transporter = createSmtpTransport();
	await transporter.sendMail({
		from: process.env.SMTP_FROM || "noreply@lanyard.local",
		to: options.to,
		subject: options.subject,
		html: options.html,
	});
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
	try {
		if (process.env.SMTP_HOST) {
			await sendViaSmtp(options);
			return;
		}
	} catch (err) {
		console.error("SMTP send failed, attempting Resend fallback:", err);
	}

	if (process.env.RESEND_API_KEY) {
		await sendViaResend(options);
		return;
	}

	console.warn(
		"No email transport configured. Email not sent:",
		options.subject,
	);
}
