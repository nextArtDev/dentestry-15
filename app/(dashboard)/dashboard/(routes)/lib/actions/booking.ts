'use server'

import { currentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateTimeSlots } from '../schemas/utils'

interface DaySchedule {
  selected: boolean
  startTime?: { hour: number; minute: number }
  endTime?: { hour: number; minute: number }
}

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

  try {
    // 2. Process selected days
    const selectedDays = Object.entries(data.days)
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // 3. Check if doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: data.doctorId },
    })

    if (!doctor) {
      return { error: 'دکتر یافت نشد' }
    }

    // 4. Update availability in transaction
    await prisma.$transaction(async (tx) => {
      // Get current availabilities
      const currentAvailabilities = await tx.availability.findMany({
        where: { doctorId: data.doctorId },
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
          parseInt(data.slotDuration)
        )

        if (!existingAvailability) {
          // Create new availability with slots
          await tx.availability.create({
            data: {
              dayName: day.dayName,
              doctorId: data.doctorId,
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

  try {
    // Find the availability for this day
    const availability = await prisma.availability.findFirst({
      where: {
        doctorId: input.doctorId,
        dayName: input.dayName,
      },
      include: {
        timeSlots: {
          include: {
            Bookings: {
              where: {
                date: input.date,
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
        .filter((booking) => booking.date === input.date)

      if (bookingsToCancel.length > 0) {
        await tx.booking.updateMany({
          where: {
            id: { in: bookingsToCancel.map((b) => b.id) },
          },
          data: {
            isCancelled: true,
            status: 'CANCELLED',
            cancelReason: input.reason || 'دکتر در این روز در دسترس نیست',
            cancelledBy: 'ADMIN',
            cancelledAt: new Date(),
          },
        })

        // TODO: Send SMS notifications to users
        // for (const booking of bookingsToCancel) {
        //   if (booking.user.phone) {
        //     await sendCancellationSMS(booking)
        //   }
        // }
      }

      // Create blocked date record
      await tx.blockedDate.create({
        data: {
          date: input.date,
          reason: input.reason,
          availabilityId: availability.id,
        },
      })
    })

    revalidatePath('/dashboard/booking')
    return { success: true, cancelledCount: bookingsToCancel.length }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: 'این تاریخ قبلاً بلاک شده است' }
    }
    console.error('Error blocking date:', error)
    return { error: 'مشکلی پیش آمده، لطفا دوباره امتحان کنید!' }
  }
}
