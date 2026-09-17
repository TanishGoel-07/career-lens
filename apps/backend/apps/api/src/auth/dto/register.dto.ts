import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters.' })
  password!: string;

  // Deliberately no `role` field here — role can NEVER be set by the
  // client at registration (architecture doc §3: "privilege escalation
  // via role field injection" is an explicit test case). Role always
  // defaults to USER server-side; promotion to ADMIN is an admin-only
  // operation (see admin module).
}
