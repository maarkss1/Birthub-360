import { Router } from "express";
import { z } from "zod";
import type { DncRepository } from "../../../application/ports/DncRepository.js";
import { PhoneNumber } from "../../../domain/value-objects/PhoneNumber.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const addToDncSchema = z.object({
  phone: z.string().min(1),
  reason: z.string().min(1),
});

export function dncRoutes(deps: { dncRepository: DncRepository }): Router {
  const router = Router();

  router.post(
    "/dnc",
    asyncHandler(async (req, res) => {
      const body = addToDncSchema.parse(req.body);
      const phone = PhoneNumber.create(body.phone);
      await deps.dncRepository.add(phone.toE164(), body.reason);
      res.status(201).json({ phone: phone.toE164(), reason: body.reason });
    }),
  );

  router.get(
    "/dnc/:phone",
    asyncHandler(async (req, res) => {
      const rawPhone = z.string().min(1).parse(req.params["phone"]);
      const phone = PhoneNumber.create(rawPhone);
      const blocked = await deps.dncRepository.isBlocked(phone.toE164());
      res.json({ phone: phone.toE164(), blocked });
    }),
  );

  return router;
}
