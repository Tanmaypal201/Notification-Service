const { transporter } = require('../config/emailconf');

transporter.verify((error, success) => {
    if (error) {
        console.log("SMTP ERROR:", error);
    } else {
        console.log("SMTP READY:", success);
    }
});

const sendVerify = async (email, verificationCode) => {
    try {
        const info = await transporter.sendMail({
            from: `"Notification Service" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `${verificationCode} is your VideoStream verification code`,

            text: `You requested to sign in to VideoStream. Your one-time verification code is ${verificationCode}. This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.`,

            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VideoStream Verification</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f6f7;
    font-family:Arial, Helvetica, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#f5f6f7; padding:30px 10px;">

    <tr>
        <td align="center">

            <!-- Main Card -->
            <table width="560" cellpadding="0" cellspacing="0" border="0"
                style="
                    max-width:560px;
                    width:100%;
                    background:#ffffff;
                    border:1px solid #e2e5e8;
                    border-radius:16px;
                    overflow:hidden;
                ">

                <!-- Content -->
                <tr>
                    <td style="padding:32px 30px 28px;">

                        <!-- Icon -->
                        <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="center"
                                    style="
                                        width:52px;
                                        height:52px;
                                        background:#f3f4f5;
                                        border-radius:50%;
                                        font-size:26px;
                                    ">
                                    ⚡
                                </td>
                            </tr>
                        </table>

                        <!-- Heading -->
                        <h1 style="
                            margin:22px 0 8px;
                            font-size:24px;
                            line-height:30px;
                            color:#171717;
                            font-weight:700;
                        ">
                            Sign in to VideoStream
                        </h1>

                        <!-- Description -->
                        <p style="
                            margin:0;
                            font-size:14px;
                            line-height:22px;
                            color:#60656b;
                        ">
                            You requested to sign in to VideoStream.
                            Your one-time code is:
                        </p>

                        <!-- OTP Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0"
                            style="margin:22px 0;">

                            <tr>
                                <td align="center"
                                    style="
                                        background:#f1f3f5;
                                        border-radius:6px;
                                        padding:15px 10px;
                                    ">

                                    <span style="
                                        font-size:28px;
                                        font-weight:700;
                                        letter-spacing:7px;
                                        color:#171717;
                                        font-family:Arial, Helvetica, sans-serif;
                                    ">
                                        ${verificationCode}
                                    </span>

                                </td>
                            </tr>

                        </table>

                        <!-- Expiry -->
                        <p style="
                            margin:0 0 26px;
                            font-size:14px;
                            line-height:22px;
                            color:#242424;
                        ">
                            This code expires in <strong>5 minutes</strong>.
                        </p>

                        <!-- Security Message -->
                        <p style="
                            margin:0;
                            font-size:14px;
                            line-height:22px;
                            color:#60656b;
                        ">
                            If you didn't request to sign in to VideoStream,
                            you can safely ignore this email. Someone else
                            might have typed your email address by mistake.
                        </p>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="
                        padding:18px 30px;
                        border-top:1px solid #eeeeee;
                        background:#fafafa;
                    ">

                        <p style="
                            margin:0;
                            text-align:center;
                            font-size:11px;
                            line-height:18px;
                            color:#92979d;
                        ">
                            Notification Service • VideoStream
                        </p>

                        <p style="
                            margin:4px 0 0;
                            text-align:center;
                            font-size:10px;
                            color:#b0b4b8;
                        ">
                            This is an automated notification. Please do not reply.
                        </p>

                    </td>
                </tr>

            </table>

        </td>
    </tr>

</table>

</body>
</html>
`,
        });
        console.log("Email sent successfully:", info.messageId);
        return info;
    } catch (err) {
        console.error("Error sending verification email:", err);
    }
};

const sendForget = async (email, verificationCode) => {
    try {
        const info = await transporter.sendMail({
            from: `"VideoStream" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `${verificationCode} is your VideoStream password reset code`,
            text: `Your password reset code is ${verificationCode}. It will expire in 5 minutes.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0d0d0f; border-radius: 12px; color: #f2efe9;">
                <h2 style="color: #e02434; margin-bottom: 16px;">Reset Your Password</h2>
                <p style="font-size: 15px; color: #c4b5b0; line-height: 1.5;">
                    We received a request to reset your password. Use the verification code below to proceed:
                </p>
                <div style="background-color: #1a1a1e; border: 1px solid #2e282a; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #ffffff; font-family: monospace;">${verificationCode}</span>
                </div>
                <p style="font-size: 13px; color: #887b76;">
                    This code is valid for 5 minutes. If you did not request a password reset, please secure your account immediately.
                </p>
                <hr style="border: none; border-top: 1px solid #2e282a; margin: 24px 0;" />
                <p style="font-size: 11px; color: #6b615d; text-align: center;">
                    &copy; ${new Date().getFullYear()} VideoStream. All rights reserved.
                </p>
            </div>
            `,
        });
        console.log("Password reset email sent successfully:", info.messageId);
        return info;
    } catch (err) {
        console.error("Error sending password reset email:", err);
    }
};

const sendVerifyAdmin = async (email, token) => {
    try {
        const baseUrl = process.env.BASE_URL || "http://localhost:3001";
        const verifyLink = process.env.ADMIN_VERIFY_URL 
            ? `${process.env.ADMIN_VERIFY_URL.replace(/\/$/, "")}/${token}`
            : `${baseUrl.replace(/\/$/, "")}/admin/verify/${token}`;

        const info = await transporter.sendMail({
            from: `"EventoNato Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify your Admin Login",

            text: `Click this link to verify your admin login: ${verifyLink}
            
This link will expire in 5 minutes.`,

            html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 24px;
                background-color: #0d0d0f;
                border-radius: 12px;
                color: #f2efe9;
            ">

                <h2 style="
                    color: #e02434;
                    margin-bottom: 16px;
                ">
                    Verify Admin Login
                </h2>

                <p style="
                    font-size: 15px;
                    color: #c4b5b0;
                    line-height: 1.5;
                ">
                    We received a request to log in to your admin account.
                    Click the button below to verify your identity and continue.
                </p>

                <div style="
                    text-align: center;
                    margin: 30px 0;
                ">
                    <a
                        href="${verifyLink}"
                        style="
                            display: inline-block;
                            padding: 14px 28px;
                            background-color: #e02434;
                            color: #ffffff;
                            text-decoration: none;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: bold;
                        "
                    >
                        Verify Admin Login
                    </a>
                </div>

                <p style="
                    font-size: 13px;
                    color: #887b76;
                    line-height: 1.5;
                ">
                    This verification link will expire in
                    <strong>5 minutes</strong>.
                </p>

                <p style="
                    font-size: 13px;
                    color: #887b76;
                    line-height: 1.5;
                ">
                    If you did not attempt to log in, you can safely ignore
                    this email.
                </p>

                <hr style="
                    border: none;
                    border-top: 1px solid #2e282a;
                    margin: 24px 0;
                " />

                <p style="
                    font-size: 11px;
                    color: #6b615d;
                    text-align: center;
                ">
                    &copy; ${new Date().getFullYear()} EventoNato.
                    All rights reserved.
                </p>

            </div>
            `,
        });

        console.log("Admin verification email sent:", info.messageId);

        return info;

    } catch (err) {
        console.error("Error sending admin verification email:", err);
        throw err;
    }
};
module.exports = { sendVerify, sendForget, sendVerifyAdmin };