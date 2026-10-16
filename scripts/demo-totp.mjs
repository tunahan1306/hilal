// Demo modu yönetici girişi için anlık TOTP kodunu yazdırır (yalnızca yerel geliştirme).
import * as OTPAuth from "otpauth";
const secret = process.env.DEMO_ADMIN_TOTP_SECRET || "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
console.log(new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate());
