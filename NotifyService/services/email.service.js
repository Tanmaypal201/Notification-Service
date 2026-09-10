const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sendWelcomeEmail = async ({ name, email }) => {
    const safeName = escapeHtml(name);

    return transporter.sendMail({
        from: `Notification Service <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Welcome, ${name}!`,

        text: `Hello ${name},

Welcome to GreatApp!

Your account has been successfully created.
We are happy to have you with us.

Let's Get Started!`,

        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to GreatApp</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial, Helvetica, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#f5f5f5;padding:30px 10px;">

    <tr>
        <td align="center">

            <!-- Main Card -->
            <table width="560" cellpadding="0" cellspacing="0" border="0"
                style="
                    max-width:560px;
                    width:100%;
                    background:#ffffff;
                    border-radius:12px;
                    overflow:hidden;
                ">

                <!-- Pink Hero Section -->
                <tr>
                    <td align="center"
                        style="
                            background:#f9cddd;
                            padding:55px 30px 40px;
                        ">

                        <!-- Confetti -->
                        <div style="
                            font-size:22px;
                            line-height:32px;
                            color:#7c3aed;
                            margin-bottom:5px;
                        ">
                            ✦ &nbsp; ✧ &nbsp; • &nbsp; ✦ &nbsp; ✧
                        </div>

                        <!-- Envelope -->
                        <table cellpadding="0" cellspacing="0" border="0"
                            style="margin:5px auto 35px;">
                            <tr>
                                <td align="center">

                                    <div style="
                                        width:190px;
                                        height:120px;
                                        background:#1769aa;
                                        border-radius:3px;
                                        position:relative;
                                        box-shadow:0 4px 8px rgba(0,0,0,0.12);
                                    ">

                                        <!-- Envelope flap -->
                                        <div style="
                                            position:absolute;
                                            top:-35px;
                                            left:30px;
                                            width:130px;
                                            height:70px;
                                            background:#2678b5;
                                            transform:rotate(45deg);
                                            border-radius:5px;
                                        "></div>

                                        <!-- Letter -->
                                        <div style="
                                            position:absolute;
                                            z-index:3;
                                            top:-25px;
                                            left:30px;
                                            width:130px;
                                            height:105px;
                                            background:#ffffff;
                                            border-radius:3px;
                                            box-shadow:0 2px 6px rgba(0,0,0,0.12);
                                            padding-top:10px;
                                        ">

                                            <div style="
                                                color:#2780bd;
                                                font-size:16px;
                                                font-weight:bold;
                                                margin-bottom:10px;
                                            ">
                                                WELCOME
                                            </div>

                                            <div style="
                                                width:55px;
                                                height:4px;
                                                background:#e8e8e8;
                                                margin:0 auto 10px;
                                            "></div>

                                            <div style="
                                                width:80px;
                                                height:4px;
                                                background:#e8e8e8;
                                                margin:0 auto 7px;
                                            "></div>

                                            <div style="
                                                width:65px;
                                                height:4px;
                                                background:#e8e8e8;
                                                margin:auto;
                                            "></div>

                                        </div>

                                        <!-- Envelope front -->
                                        <div style="
                                            position:absolute;
                                            z-index:4;
                                            bottom:0;
                                            left:0;
                                            width:0;
                                            height:0;
                                            border-left:95px solid transparent;
                                            border-right:95px solid transparent;
                                            border-bottom:70px solid #1769aa;
                                        "></div>

                                    </div>

                                </td>
                            </tr>
                        </table>

                        <!-- Heading -->
                        <h1 style="
                            margin:0 0 15px;
                            color:#171717;
                            font-size:26px;
                            font-weight:700;
                        ">
                            Welcome to GreatApp
                        </h1>

                        <!-- Subtitle -->
                        <p style="
                            margin:0;
                            color:#444444;
                            font-size:16px;
                            line-height:24px;
                        ">
                            Thank you for subscribing!
                        </p>

                    </td>
                </tr>

                <!-- Bottom Section -->
                <tr>
                    <td align="center"
                        style="
                            background:#ffffff;
                            padding:25px 30px 30px;
                        ">

                        <h2 style="
                            margin:0;
                            color:#202020;
                            font-size:20px;
                            font-weight:700;
                        ">
                            Let's Get Started
                        </h2>

                        <!-- Small underline -->
                        <div style="
                            width:45px;
                            height:2px;
                            background:#f9cddd;
                            margin:10px auto 0;
                        "></div>

                        <p style="
                            margin:18px 0 0;
                            color:#6b7280;
                            font-size:14px;
                            line-height:22px;
                        ">
                            Your account is ready.
                            We are excited to have you with us!
                        </p>

                        <!-- Button -->
                        <a href="#"
                            style="
                                display:inline-block;
                                margin-top:20px;
                                padding:12px 28px;
                                background:#1769aa;
                                color:#ffffff;
                                text-decoration:none;
                                border-radius:6px;
                                font-size:14px;
                                font-weight:bold;
                            ">
                            Get Started
                        </a>

                    </td>
                </tr>

            </table>

            <!-- Footer -->
            <p style="
                margin:20px 0 0;
                color:#9ca3af;
                font-size:12px;
                text-align:center;
            ">
                This is an automated notification from GreatApp.
            </p>

        </td>
    </tr>

</table>

</body>
</html>
`
    });
};

module.exports = { sendWelcomeEmail };
