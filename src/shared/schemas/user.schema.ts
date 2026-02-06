import { object, string } from "zod";

/*
  validating the user sign up fields
  on server side
*/
export const signupUserSchema = object({
  body: object({
    name: string({
      required_error: "User name field is required",
    }),
    email: string({
      required_error: "User email field is required",
    }).email("Invalid email"),

    password: string({
      required_error: "User password field is required",
    }).min(8, "Password is too short! It should be atleast 8 characters"),

    imageUrl: string().optional(),
  }),
});

/*
  validating the user sign in fields
  on server side
*/
export const loginUserSchema = object({
  body: object({
    email: string({
      required_error: "User email field is required",
    }).email("Invalid email"),

    password: string({
      required_error: "User password field is required",
    }),
  }),
});
