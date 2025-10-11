/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { FC, useTransition } from 'react'

import { TimerIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
// import { createAvailability } from '@/lib/actions/booking/availability'
// import { cn, translateDays } from '@/lib/utils/index'
// import { Doctor } from '@prisma/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Time } from '@internationalized/date'
// import { TimeValue } from 'react-aria'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TimeField } from './data-table/time-picker/time-field'
import { useRouter } from 'next/navigation'
import { Doctor } from '@/lib/generated/prisma'
import { availabilityFormSchema } from '../../lib/schemas'
import { createOrUpdateAvailability } from '../../lib/actions/booking'
import { cn } from '@/lib/utils'
import { translateDays } from '../../lib/utils'

// type DayData = {
//   dayName: string
//   selected: boolean
//   startTime?: TimeValue | null // adjust according to your needs
//   endTime?: TimeValue | null // adjust according to your needs
// }

const slices = [2, 5, 7, 10, 15, 30]

interface AvailabilityTableProps {
  doctors: Doctor[]
  existingAvailability?: any // Type this properly based on your data structure
}
const AvailabilityTable: FC<AvailabilityTableProps> = ({
  doctors,
  existingAvailability,
}) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Function to map existing availability to form values
  const mapExistingAvailabilityToFormValues = (availability: any) => {
    // Implementation depends on your data structure
    // This would convert your existing availability data to the form's expected format
    const days: any = {
      monday: { selected: false, startTime: undefined, endTime: undefined },
      tuesday: { selected: false, startTime: undefined, endTime: undefined },
      wednesday: { selected: false, startTime: undefined, endTime: undefined },
      thursday: { selected: false, startTime: undefined, endTime: undefined },
      friday: { selected: false, startTime: undefined, endTime: undefined },
      saturday: { selected: false, startTime: undefined, endTime: undefined },
      sunday: { selected: false, startTime: undefined, endTime: undefined },
    }

    // If availability exists, map it to the form
    if (availability && availability.days) {
      availability.days.forEach((day: any) => {
        if (days[day.dayName]) {
          days[day.dayName] = {
            selected: true,
            startTime: day.startTime
              ? {
                  hour: parseInt(day.startTime.split(':')[0]),
                  minute: parseInt(day.startTime.split(':')[1]),
                }
              : undefined,
            endTime: day.endTime
              ? {
                  hour: parseInt(day.endTime.split(':')[0]),
                  minute: parseInt(day.endTime.split(':')[1]),
                }
              : undefined,
          }
        }
      })
    }

    return {
      doctorId: availability?.doctorId || '',
      slotDuration: +availability?.slotDuration || 15,
      days,
    }
  }
  // let slotDuration= availability?.slotDuration?.toString() || '15',
  const form = useForm<z.infer<typeof availabilityFormSchema>>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: existingAvailability
      ? // Map existing availability to form values
        mapExistingAvailabilityToFormValues(existingAvailability)
      : {
          doctorId: '',
          slotDuration: +15,
          days: {
            monday: {
              selected: false,
              startTime: undefined,
              endTime: undefined,
            },
            tuesday: {
              selected: false,
              startTime: undefined,
              endTime: undefined,
            },
            wednesday: {
              selected: false,
              startTime: undefined,
              endTime: undefined,
            },
            thursday: {
              selected: false,
              startTime: undefined,
              endTime: undefined,
            },
            friday: {
              selected: false,
              startTime: undefined,
              endTime: undefined,
            },
            saturday: {
              selected: false,
              startTime: undefined,
              endTime: undefined,
            },
            sunday: {
              selected: false,
              startTime: undefined,
              endTime: undefined,
            },
          },
        },
  })

  function onSubmit(data: z.infer<typeof availabilityFormSchema>) {
    // Create a days object that matches the expected type
    const days: Record<string, any> = {}

    // Only include selected days
    Object.entries(data.days).forEach(([dayName, dayData]) => {
      if (dayData.selected && dayData.endTime && dayData.startTime) {
        days[dayName] = {
          selected: dayData.selected,
          startTime: dayData.startTime, // Keep as object with hour and minute
          endTime: dayData.endTime, // Keep as object with hour and minute
        }
      }
    })

    startTransition(async () => {
      try {
        const result = await createOrUpdateAvailability({
          days,
          doctorId: data.doctorId,
          slotDuration: data.slotDuration.toString(),
        })

        if (result.success) {
          router.push('/dashboard/booking')
          toast.success('تعیین نوبت با موفقیت انجام شد.')
        } else {
          toast.error(result.error || 'مشکلی پیش آمده لطفا دوباره امتحان کنید!')
        }
      } catch (error) {
        console.error('Error creating availability:', error)
        toast.error('مشکلی پیش آمده لطفا دوباره امتحان کنید!')
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAnyDaySelected = (days: any) => {
    return Object.values(days).some((day: any) => day.selected)
  }

  // Inside your component
  const selectedDays = form.watch('days')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <section className="rounded-lg py-6 px-2 max-w-md mx-auto">
          <h1 className="text-center font-semibold text-base md:text-lg">
            فرم نوبت دهی
          </h1>
          <div className="grid grid-cols-6 gap-2 my-4 pb-4">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem className="col-span-4">
                  <FormLabel>نام دکتر</FormLabel>
                  <Select
                    dir="rtl"
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="دکتر را انتخاب کنید" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={String(doctor.id)}>
                          {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slotDuration"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>بازه زمانی</FormLabel>
                  <Select
                    dir="rtl"
                    onValueChange={field.onChange}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue className="" placeholder="بازه (دقیقه)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {slices.map((slice, index) => (
                        <SelectItem key={index} value={String(slice)}>
                          {slice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <ul className="flex flex-col gap-4">
            {Object.keys(availabilityFormSchema.shape.days.shape).map((day) => (
              <DayAvailabilityRow
                key={day}
                day={day}
                control={form.control}
                form={form}
              />
            ))}
          </ul>
          <Button
            disabled={!isAnyDaySelected(selectedDays) || isPending}
            className="w-full my-4"
            type="submit"
          >
            تایید
          </Button>
        </section>
      </form>
    </Form>
  )
}

// Extracted DayAvailabilityRow component
const DayAvailabilityRow: FC<{
  day: string
  control: any
  form: any
}> = ({ day, control, form }) => {
  return (
    <article className={cn('grid grid-cols-6 h-16', 'border rounded-md px-2')}>
      <div className="col-span-2 ml-auto flex justify-center items-center gap-1">
        <FormField
          control={control}
          name={`days.${day}.selected`}
          render={({ field }) => (
            <FormItem className="">
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="pr-1">
                {translateDays(day.charAt(0).toUpperCase() + day.slice(1))}
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="col-span-4 grid grid-cols-2 gap-5">
        <div
          dir="ltr"
          className="flex items-center justify-center gap-1 order-first"
        >
          <FormField
            control={control}
            name={`days.${day}.startTime`}
            render={({ field }) => (
              <FormItem className="flex gap-1 items-center justify-center">
                <FormControl>
                  <TimeField
                    defaultValue={new Time(9, 0)} // Set a more reasonable default
                    suffix={<TimerIcon />}
                    hourCycle={24}
                    size="sm"
                    isDisabled={!form.watch(`days.${day}.selected`)}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>از</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div
          dir="ltr"
          className="order-last flex items-center justify-center gap-1"
        >
          <FormField
            control={control}
            name={`days.${day}.endTime`}
            render={({ field }) => (
              <FormItem className="flex gap-1 items-center justify-center">
                <FormControl>
                  <TimeField
                    isDisabled={!form.watch(`days.${day}.selected`)}
                    defaultValue={new Time(17, 0)} // Set a more reasonable default
                    hourCycle={24}
                    suffix={<TimerIcon />}
                    size="sm"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>تا</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </article>
  )
}

export default AvailabilityTable
