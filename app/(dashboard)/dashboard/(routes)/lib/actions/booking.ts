'use server'

import { currentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { z } from 'zod'
import { generateTimeSlots } from '../utils'

// Define validation schemas
const DayScheduleSchema = z
  .object({
    selected: z.boolean(),
    startTime: z
      .object({
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
      })
      .optional(),
    endTime: z
      .object({
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
      })
      .optional(),
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

const CreateAvailabilitySchema = z.object({
  doctorId: z.string().min(1, 'لطفاً یک دکتر انتخاب کنید'),
  slotDuration: z
    .string()
    .transform(Number)
    .pipe(z.number().min(5, 'بازه زمانی باید حداقل ۵ دقیقه باشد')),
  days: z
    .record(z.string(), DayScheduleSchema)
    .refine((data) => Object.values(data).some((day) => day.selected), {
      message: 'حداقل یک روز باید انتخاب شود',
      path: ['saturday'], // Path to any day field
    }),
})

const BlockDateSchema = z.object({
  doctorId: z.string().min(1, 'لطفاً یک دکتر انتخاب کنید'),
  date: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ نامعتبر است'),
  dayName: z.enum([
    'saturday',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ]),
  reason: z.string().optional(),
})

type DaySchedule = z.infer<typeof DayScheduleSchema>

interface CreateAvailabilityInput {
  doctorId: string
  slotDuration: string // in minutes
  days: Record<string, DaySchedule>
}

export async function createOrUpdateAvailability(
  data: CreateAvailabilityInput
) {
  // 1. Check authentication
  const user = await currentUser()
  if (!user?.id) redirect('/login')
  if (user.role !== 'admin') {
    return { error: 'شما اجازه دسترسی ندارید!' }
  }

  // 2. Validate input
  const validatedData = CreateAvailabilitySchema.parse(data)

  try {
    // 3. Process selected days
    const selectedDays = Object.entries(validatedData.days)
      .filter(
        ([_, dayData]) =>
          dayData.selected && dayData.startTime && dayData.endTime
      )
      .map(([dayName, dayData]) => ({
        dayName: dayName.toLowerCase(),
        startTime: `${dayData.startTime!.hour.toString().padStart(2, '0')}:${dayData.startTime!.minute.toString().padStart(2, '0')}`,
        endTime: `${dayData.endTime!.hour.toString().padStart(2, '0')}:${dayData.endTime!.minute.toString().padStart(2, '0')}`,
      }))

    if (selectedDays.length === 0) {
      return { error: 'حداقل یک روز باید انتخاب شود' }
    }

    // 4. Check if doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: validatedData.doctorId },
    })

    if (!doctor) {
      return { error: 'دکتر یافت نشد' }
    }

    // 5. Update availability in transaction
    await prisma.$transaction(async (tx) => {
      // Get current availabilities
      const currentAvailabilities = await tx.availability.findMany({
        where: { doctorId: validatedData.doctorId },
        include: {
          timeSlots: {
            include: {
              Bookings: {
                where: {
                  isCancelled: false,
                },
              },
            },
          },
        },
      })

      const currentDayNames = currentAvailabilities.map((a) => a.dayName)
      const newDayNames = selectedDays.map((d) => d.dayName)

      // Find days to remove (not in new selection)
      const daysToRemove = currentDayNames.filter(
        (day) => !newDayNames.includes(day)
      )

      // Remove old days that are not selected anymore
      if (daysToRemove.length > 0) {
        for (const dayName of daysToRemove) {
          const availability = currentAvailabilities.find(
            (a) => a.dayName === dayName
          )
          if (!availability) continue

          // Check if there are active bookings
          const hasActiveBookings = availability.timeSlots.some(
            (slot) => slot.Bookings.length > 0
          )

          if (hasActiveBookings) {
            // Don't delete, just remove future empty slots
            const emptySlotIds = availability.timeSlots
              .filter((slot) => slot.Bookings.length === 0)
              .map((slot) => slot.id)

            if (emptySlotIds.length > 0) {
              await tx.timeSlot.deleteMany({
                where: { id: { in: emptySlotIds } },
              })
            }
          } else {
            // No bookings, safe to delete
            await tx.availability.delete({
              where: { id: availability.id },
            })
          }
        }
      }

      // Process each selected day
      for (const day of selectedDays) {
        const existingAvailability = currentAvailabilities.find(
          (a) => a.dayName === day.dayName
        )

        // Generate time slots for this day
        const timeSlots = generateTimeSlots(
          day.startTime,
          day.endTime,
          parseInt(validatedData.slotDuration.toString())
        )

        if (!existingAvailability) {
          // Create new availability with slots
          await tx.availability.create({
            data: {
              dayName: day.dayName,
              doctorId: validatedData.doctorId,
              timeSlots: {
                create: timeSlots.map((time) => ({ time })),
              },
            },
          })
        } else {
          // Update existing availability
          const existingSlots = existingAvailability.timeSlots.map(
            (s) => s.time
          )
          const newSlots = timeSlots.filter(
            (time) => !existingSlots.includes(time)
          )
          const slotsToRemove = existingSlots.filter(
            (time) => !timeSlots.includes(time)
          )

          // Add new slots
          if (newSlots.length > 0) {
            await tx.timeSlot.createMany({
              data: newSlots.map((time) => ({
                time,
                availabilityId: existingAvailability.id,
              })),
            })
          }

          // Remove old slots (only if no bookings)
          if (slotsToRemove.length > 0) {
            const slotsToDelete = existingAvailability.timeSlots.filter(
              (slot) =>
                slotsToRemove.includes(slot.time) && slot.Bookings.length === 0
            )

            if (slotsToDelete.length > 0) {
              await tx.timeSlot.deleteMany({
                where: {
                  id: { in: slotsToDelete.map((s) => s.id) },
                },
              })
            }
          }
        }
      }
    })

    revalidatePath('/dashboard/booking')
    return { success: true }
  } catch (error) {
    console.error('Error creating availability:', error)
    return { error: 'مشکلی پیش آمده، لطفا دوباره امتحان کنید!' }
  }
}

interface BlockDateInput {
  doctorId: string
  date: string // "2025/10/20"
  dayName: string // "monday"
  reason?: string
}

export async function blockSpecificDate(input: BlockDateInput) {
  const user = await currentUser()
  if (!user?.id) redirect('/login')
  if (user.role !== 'admin') {
    return { error: 'شما اجازه دسترسی ندارید!' }
  }

  // Validate input
  const validatedInput = BlockDateSchema.parse(input)

  try {
    // Find the availability for this day
    const availability = await prisma.availability.findFirst({
      where: {
        doctorId: validatedInput.doctorId,
        dayName: validatedInput.dayName,
      },
      include: {
        timeSlots: {
          include: {
            Bookings: {
              where: {
                date: validatedInput.date,
                isCancelled: false,
              },
              include: {
                user: {
                  select: {
                    name: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!availability) {
      return { error: 'برنامه زمانی برای این روز یافت نشد' }
    }

    let bookingsToCancel = []
    await prisma.$transaction(async (tx) => {
      // Cancel all existing bookings for this date
      bookingsToCancel = availability.timeSlots
        .flatMap((slot) => slot.Bookings)
        .filter((booking) => booking.date === validatedInput.date)

      if (bookingsToCancel.length > 0) {
        await tx.booking.updateMany({
          where: {
            id: { in: bookingsToCancel.map((b) => b.id) },
          },
          data: {
            isCancelled: true,
            status: 'CANCELLED',
            cancelReason:
              validatedInput.reason || 'دکتر در این روز در دسترس نیست',
            cancelledBy: 'ADMIN',
            cancelledAt: new Date(),
          },
        })

        // Create notifications for cancelled bookings
        await tx.notification.createMany({
          data: bookingsToCancel.map((booking) => ({
            title: 'لغو نوبت',
            message: `نوبت شما در تاریخ ${validatedInput.date} لغو شد. دلیل: ${validatedInput.reason || 'دکتر در این روز در دسترس نیست'}`,
            type: 'APPOINTMENT_CANCELLED',
            userId: booking.userId,
            bookingId: booking.id,
          })),
        })

        // TODO: Send SMS notifications to users
        // for (const booking of bookingsToCancel) {
        //   if (booking.user.phoneNumber) {
        //     await sendCancellationSMS(booking)
        //   }
        // }
      }

      // Create blocked date record
      await tx.blockedDate.create({
        data: {
          date: validatedInput.date,
          reason: validatedInput.reason,
          availabilityId: availability.id,
        },
      })
    })

    revalidatePath('/dashboard/booking')
    return { success: true, cancelledCount: bookingsToCancel.length }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: 'این تاریخ قبلاً بلاک شده است' }
    }
    console.error('Error blocking date:', error)
    return { error: 'مشکلی پیش آمده، لطفا دوباره امتحان کنید!' }
  }
}

// New function to get available time slots for a specific date
export async function getAvailableTimeSlots(doctorId: string, date: string) {
  try {
    // Convert Jalali date to day of week
    const dayOfWeek = convertJalaliToDayOfWeek(date)

    // Get availability for this day of week
    const availability = await prisma.availability.findFirst({
      where: {
        doctorId,
        dayName: dayOfWeek,
      },
      include: {
        timeSlots: {
          include: {
            Bookings: {
              where: {
                date,
                isCancelled: false,
              },
            },
          },
        },
        blockedDates: {
          where: {
            date,
          },
        },
      },
    })

    if (!availability || availability.blockedDates.length > 0) {
      return { availableSlots: [] }
    }

    // Filter out booked slots
    const availableSlots = availability.timeSlots.filter(
      (slot) => slot.Bookings.length === 0
    )

    return { availableSlots }
  } catch (error) {
    console.error('Error getting available time slots:', error)
    return { error: 'مشکلی پیش آمده، لطفا دوباره امتحان کنید!' }
  }
}

// Helper function to convert Jalali date to day of week
function convertJalaliToDayOfWeek(jalaliDate: string): string {
  // Implementation depends on your date library
  // This is a placeholder - you'll need to implement the actual conversion
  const [year, month, day] = jalaliDate.split('/').map(Number)
  // Convert to Gregorian and then to day of week
  // Return one of: "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"
  return 'saturday' // Placeholder
}
