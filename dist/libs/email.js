"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailAction = sendEmailAction;
const nodemailer_1 = __importDefault(require("./nodemailer"));
const styles = {
    container: "max-width:500px;margin:20px auto;padding:20px;border:1px solid #ddd;border-radius:6px;",
    heading: "font-size:20px;color:#333;",
    paragraph: "font-size:16px;",
    link: "display:inline-block;margin-top:15px;padding:10px 15px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;",
};
async function sendEmailAction({ to, subject, meta, }) {
    const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to,
        subject: `GameCord - ${subject}`,
        html: `
    <div style="${styles.container}">
      <h1 style="${styles.heading}">${subject}</h1>
      <p style="${styles.paragraph}">${meta.description}</p>
      <a href="${meta.link}" style="${styles.link}">Click Here</a>
    </div>
    `,
    };
    try {
        await nodemailer_1.default.sendMail(mailOptions);
        return { success: true };
    }
    catch (err) {
        console.error("[SendEmail]:", err);
        return { success: false };
    }
}
//# sourceMappingURL=email.js.map