import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString } from 'class-validator';

@InputType()
export class RecoverPasswordInput {
  @Field()
  @IsString()
  token!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  password!: string;
}
