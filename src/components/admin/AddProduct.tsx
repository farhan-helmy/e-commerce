/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/

import React, { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition, Listbox } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon, ExclamationCircleIcon, PhotoIcon, PlusCircleIcon } from '@heroicons/react/20/solid'
import type { SubmitHandler } from 'react-hook-form';
import { useForm, useFieldArray } from 'react-hook-form';
import { useS3Upload } from 'next-s3-upload';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '../../utils/trpc';
import 'react-quill/dist/quill.snow.css';
import LoadingSpinner from '../LoadingSpinner';
import Image from "next/image"
import useNotificationStore from '../../store/notification';

type AddProductProps = {
  open: boolean
  setOpen: (value: boolean) => void
}

const schema = z.object({
  name: z.string().min(1, { message: "Name is required" }).max(100),
  price: z.string().min(1, { message: "Price is required" }).max(100),
  weight: z.string().min(1, { message: "Weight is required" }).max(100),
  description: z.string().min(1, { message: "Description is required" }),
  image: z.array(
    z.object({
      src: z.string().min(1, { message: "src name is required" }).max(1000),
    })
  ),
  variant: z.array(z.object({
    name: z.string().min(1, { message: "Variant name is required" }).max(100),
    imageSrc: z.string().min(1, { message: "Variant image is required" }).max(10000),
  }))
})

type ProductFormInputs = {
  name: string
  price: string
  weight: string
  description: string
  image: {
    src: string
  }[]
  variant: {
    name: string
    imageSrc: string
  }[]
}

export type ImagePreviews = {
  id: string,
  url: string
}

const variantTypes = [
  { id: 1, name: 'Colour' },
]

const classNames = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ')
}

export default function AddProduct({ open, setOpen }: AddProductProps) {
  const ReactQuill = typeof window === 'object' ? require('react-quill') : () => false;

  const [imagePreviews, setImagePreviews] = useState<ImagePreviews[]>();

  const addProduct = trpc.products.addProduct.useMutation();
  const products = trpc.products.getAll.useQuery();

  const { register, setValue, getValues, control, handleSubmit, formState: { errors } } = useForm<ProductFormInputs>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { image: [{ src: "" }], variant: [{ name: '', imageSrc: "" }] } });

  const { fields, append, remove } = useFieldArray({
    name: "variant",
    control
  })

  const [selectedVariantType, setSelectedVariantType] = useState(variantTypes[0])
  const [description, setDescription] = useState('')

  const { uploadToS3 } = useS3Upload();
  const notificationStore = useNotificationStore();

  const onProductImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const images: ImagePreviews[] = [];
    const urls: string[] = [];

    if (e.target.files === null) return;

    for (const element of e.target.files) {
      images.push(URL.createObjectURL(element as Blob) as unknown as ImagePreviews);
      const { url } = await uploadToS3(element);
      const cloudFrontUrl = url.replace('https://hustlermy-dev.s3.ap-southeast-1.amazonaws.com', 'https://d1sah57fmj9klu.cloudfront.net');
      urls.push(cloudFrontUrl);
    }

    setImagePreviews(images);
    // const { url } = await uploadToS3(file);
    setValue('image', urls.map(url => ({ src: url })));
  }


  const handleAddMoreImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files === null) return;
    const file = e.target?.files[0];
    const { url } = await uploadToS3(file as File);
    const cloudFrontUrl = url.replace('https://hustlermy-dev.s3.ap-southeast-1.amazonaws.com', 'https://d1sah57fmj9klu.cloudfront.net');
    const images = getValues('image');
    setValue('image', [...images, { src: cloudFrontUrl }]);

    setImagePreviews([...imagePreviews as ImagePreviews[], URL.createObjectURL(file as Blob) as unknown as ImagePreviews]);
    // console.log(imagePreviews)
  }

  const onVariantImageChange = async (e: any, index: number) => {
    if (!e.currentTarget.files) return;
    const file = e.target.files[0];
    const { url } = await uploadToS3(file);
    const cloudFrontUrl = url.replace('https://hustlermy-dev.s3.ap-southeast-1.amazonaws.com', 'https://d1sah57fmj9klu.cloudfront.net');
    setValue(`variant.${index}.imageSrc`, cloudFrontUrl);
  }

  const onSubmit: SubmitHandler<ProductFormInputs> = data => {

    addProduct.mutateAsync(data)
      .then(() => {
        setOpen(false);
      })
      .then(() => {
        notificationStore.showNotification({
          title: "Success!",
          message: `${data.name} product added successfully`,
          success: true,
          show: true
        });
        products.refetch();
      }
      )
  };

  useEffect(() => {
    setValue('description', description)
  }, [description, setValue])
  return (
    <>

      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >

                <Dialog.Panel className={`relative transform overflow-hidden w-full rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6`}>
                  <form className="space-y-8 divide-y divide-gray-200" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-8 divide-y divide-gray-200">
                      <div>
                        <div>
                          <h3 className="text-lg font-medium leading-6 text-gray-900">Details</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Fill up product details.
                          </p>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-4">
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                              Name
                            </label>
                            <div className="relative mt-1 flex rounded-md shadow-sm">
                              <input
                                {...register("name", { required: true })}
                                type="text"
                                autoComplete="productName"
                                aria-invalid={errors.name ? "true" : "false"}
                                className="block w-full rounded-md border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                              {errors.name?.message && <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                              </div>}
                            </div>
                            <p className="mt-2 text-sm text-red-600">{errors.name?.message}</p>
                          </div>
                          <div className="sm:col-span-3">
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                              Price
                            </label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">RM</span>
                              </div>
                              <input
                                {...register("price", { required: true })}
                                type="number"
                                className="block w-full rounded-md border-gray-300 pl-9 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="0.00"
                                aria-describedby="price-currency"
                                min="1"
                                step="any"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm" id="price-currency">
                                  MYR
                                </span>
                                {errors.price?.message && <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />}
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-red-600">{errors.price?.message}</p>
                          </div>
                          <div className="sm:col-span-3">
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                              Weight
                            </label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                              <input
                                {...register("weight", { required: true })}
                                type="number"
                                className="block w-full rounded-md border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder=""
                                aria-describedby="price-currency"
                                step="0.1"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm" id="price-currency">
                                  KG
                                </span>
                                {errors.weight?.message && <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />}
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-red-600">{errors.weight?.message}</p>
                          </div>
                          <div className="sm:col-span-6">
                            <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <div className="mt-1">
                              {/* <textarea
                              {...register("description", { required: true })}
                              rows={3}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              defaultValue={''}
                            /> */}
                              <ReactQuill theme="snow" value={description} onChange={setDescription} />
                              <textarea className='hidden' {...register("description", { required: false })} value={description} />
                            </div>
                            <p className="mt-2 text-sm text-gray-500">Enter product description.</p>
                            <p className="mt-2 text-sm text-red-600">{errors.description?.message}</p>
                          </div>
                          <div className="sm:col-span-6">
                            <label htmlFor="cover-photo" className="block text-sm font-medium text-gray-700">
                              Product photo
                            </label>

                            {!imagePreviews ? (
                              <div className="flex text-sm text-gray-600">
                                <label
                                  htmlFor="product-image-upload"
                                  className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                                >
                                  <div className="group relative m-4">
                                    <PhotoIcon className="h-12 w-12" />
                                    <span className="absolute top-10 scale-0 transition-all rounded bg-gray-800 p-2 text-md text-white group-hover:scale-100">✨ click to add photo!</span>
                                  </div>
                                  <input type="file" name="product-image-upload" id="product-image-upload" className="sr-only" onChange={(e) => onProductImageChange(e)} multiple accept="image/*" />
                                </label>
                              </div>
                            ) : null}

                            <div className="">
                              <div className="grid-cols-4 p-4 space-y-2 grid">
                                {imagePreviews ? (
                                  imagePreviews.map((imagePreview, index) => (
                                    <div key={index}>
                                      <h1>{imagePreview.url}</h1>
                                      <Image src={imagePreview as unknown as string} alt="xsd" height={250} width={250} />
                                    </div>
                                  ))) : null}
                                {imagePreviews ? (
                                  <div className="flex flex-col justify-center items-center border border-b rounded-lg h-40">
                                    <label
                                      htmlFor="add-more-product-image-upload"
                                      className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                                    >
                                      <span>
                                        <PlusCircleIcon className="h-5 w-5" aria-hidden="true" />
                                      </span>
                                      <input type="file" name="add-more-product-image-upload" id="add-more-product-image-upload" className="sr-only" onChange={(e) => handleAddMoreImages(e)} multiple accept="image/*" />
                                    </label>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                      <div className="pt-8">
                        <div>
                          <h3 className="text-lg font-medium leading-6 text-gray-900">Variant</h3>
                          <p className="mt-1 text-sm text-gray-500">Add product variant</p>
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                          <div className="sm:col-span-6">
                            <Listbox value={selectedVariantType} onChange={setSelectedVariantType}>
                              {({ open }) => (
                                <>
                                  <Listbox.Label className="block text-sm font-medium text-gray-700">Type</Listbox.Label>
                                  <div className="relative mt-1">
                                    <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                                      <span className="block truncate">{selectedVariantType?.name}</span>
                                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                      </span>
                                    </Listbox.Button>

                                    <Transition
                                      show={open}
                                      as={Fragment}
                                      leave="transition ease-in duration-100"
                                      leaveFrom="opacity-100"
                                      leaveTo="opacity-0"
                                    >
                                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                        {variantTypes.map((variantType) => (
                                          <Listbox.Option
                                            key={variantType.id}
                                            className={({ active }) =>
                                              classNames(
                                                active ? 'text-white bg-indigo-600' : 'text-gray-900',
                                                'relative cursor-default select-none py-2 pl-3 pr-9'
                                              )
                                            }
                                            value={variantType}
                                          >
                                            {({ selected, active }) => (
                                              <>
                                                <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                                                  {variantType.name}
                                                </span>

                                                {selected ? (
                                                  <span
                                                    className={classNames(
                                                      active ? 'text-white' : 'text-indigo-600',
                                                      'absolute inset-y-0 right-0 flex items-center pr-4'
                                                    )}
                                                  >
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                  </span>
                                                ) : null}
                                              </>
                                            )}
                                          </Listbox.Option>
                                        ))}
                                      </Listbox.Options>
                                    </Transition>
                                  </div>
                                </>
                              )}
                            </Listbox>
                          </div>
                          <div className="sm:col-span-4">
                            {fields.map((field, index) => (
                              <div key={field.id}>
                                <div>
                                  <div className="mt-1 mb-2 flex rounded-md shadow-sm">
                                    <div className="relative flex flex-grow items-stretch focus-within:z-10">
                                      <input
                                        key={field.id}
                                        {...register(`variant.${index}.name` as const, {
                                          required: true
                                        })}
                                        type="text"
                                        className="block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        placeholder=""
                                      />
                                    </div>
                                    <button
                                      onClick={() => remove(index)}
                                      type="button"
                                      className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      -
                                    </button>
                                  </div>
                                  <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 py-4 mb-2">

                                    {getValues(`variant.${index}.imageSrc`) === "" ? (<div className="flex text-sm text-gray-600">
                                      <label
                                        htmlFor={`variant-image-${index}-upload`}
                                        className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                                      >
                                        <span>+</span>
                                        <input {...register(`variant.${index}.imageSrc` as const, {
                                          required: true
                                        })} name={`variant-image-${index}-upload`} id={`variant-image-${index}-upload`} type="file" className="sr-only" onChange={(e) => onVariantImageChange(e, index)} />
                                      </label>
                                    </div>) : (
                                      <div className="flex flex-col justify-center items-center">
                                        <img src={getValues(`variant.${index}.imageSrc`)} alt="" className="h-36 w-36" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() =>
                                append({
                                  name: "",
                                  imageSrc: ""
                                })
                              }
                              type="button"
                              className="inline-flex items-center rounded border border-transparent bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setOpen(false)}
                          type="button"
                          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          {addProduct.isLoading ? 'Loading...' : 'Submit'}

                        </button>

                      </div>
                      {addProduct.isLoading ? <LoadingSpinner /> : ""}

                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>

        </Dialog>
      </Transition.Root>
    </>
  )
}
