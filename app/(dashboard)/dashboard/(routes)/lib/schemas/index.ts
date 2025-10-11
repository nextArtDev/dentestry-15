import z from 'zod'

const timeSchema = z.object({
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59),
})

const daySchema = z
  .object({
    selected: z.boolean(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.selected && data.startTime && data.endTime) {
        const startMinutes = data.startTime.hour * 60 + data.startTime.minute
        const endMinutes = data.endTime.hour * 60 + data.endTime.minute
        return endMinutes > startMinutes
      }
      return true
    },
    {
      message: 'زمان پایان باید بعد از زمان شروع باشد',
      path: ['endTime'],
    }
  )

export const availabilityFormSchema = z.object({
  doctorId: z.string().min(1, 'لطفاً یک دکتر انتخاب کنید'),
  slotDuration: z
    .number()
    .transform(Number)
    .pipe(z.number().min(5, 'بازه زمانی باید حداقل ۵ دقیقه باشد')),
  days: z
    .object({
      saturday: daySchema,
      sunday: daySchema,
      monday: daySchema,
      tuesday: daySchema,
      wednesday: daySchema,
      thursday: daySchema,
      friday: daySchema,
    })
    .refine((data) => Object.values(data).some((day) => day.selected), {
      message: 'حداقل یک روز باید انتخاب شود',
      path: ['saturday'], // Path to any day field
    }),
})
