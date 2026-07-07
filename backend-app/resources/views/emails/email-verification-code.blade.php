<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code de validation MediAI</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background-color:#10b981;padding:24px;text-align:center;">
                            <span style="font-size:28px;">🧬</span>
                            <div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:8px;">MediAI</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 28px;">
                            <p style="font-size:16px;margin:0 0 16px;">Bonjour{{ $prenom ? ' '.$prenom : '' }},</p>
                            <p style="font-size:15px;line-height:1.5;margin:0 0 24px;color:#4b5563;">
                                Votre compte MediAI vient d'être créé.
                                Saisissez le code ci-dessous dans l'application pour valider votre compte :
                            </p>
                            <div style="text-align:center;margin:0 0 24px;">
                                <span style="display:inline-block;font-size:34px;font-weight:bold;letter-spacing:10px;color:#10b981;background-color:#ecfdf5;padding:16px 24px;border-radius:10px;">{{ $code }}</span>
                            </div>
                            <p style="font-size:14px;line-height:1.5;margin:0 0 8px;color:#6b7280;">
                                Ce code expire dans <strong>{{ $expiresInMinutes }} minutes</strong>.
                            </p>
                            <p style="font-size:14px;line-height:1.5;margin:0;color:#6b7280;">
                                Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet e-mail.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
                            © {{ date('Y') }} MediAI — Votre assistant santé intelligent
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
