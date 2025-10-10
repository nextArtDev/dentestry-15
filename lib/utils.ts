import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import qs from 'query-string'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phoneNumber: string) {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '')

  // Check if the number starts with '0' and has 11 digits
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+98${digits.slice(1)}`
  }

  // Check if the number starts with '98' and has 12 digits
  if (digits.length === 12 && digits.startsWith('98')) {
    return `+${digits}`
  }

  // Check if the number starts with '+98' and has 13 digits
  if (digits.length === 13 && digits.startsWith('989')) {
    return `+${digits}`
  }

  // If none of the above, return the original input
  return phoneNumber
}

interface UrlQueryParams {
  params: string
  key: string
  value: string | null
}
export const formUrlQuery = ({ params, key, value }: UrlQueryParams) => {
  // accessing the current url
  const currentUrl = qs.parse(params)
  // query-string package automatically gives you the search params

  // it only updates the one we want to update, while keeping everything else the same in component's useState
  currentUrl[key] = value

  return qs.stringifyUrl(
    {
      // base url
      url: window.location.pathname,
      // current url
      query: currentUrl,
    },
    // options: we don't need null values
    { skipNull: true }
  )
}
