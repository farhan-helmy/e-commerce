import { router, publicProcedure } from "../trpc";
import { z } from 'zod';
import { ProductInput, UpdateProductInput } from "./types";

export const productRouter = router({
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      const products = await ctx.prisma.product.findMany({
        include: {
          images: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return products;
    }),
  getProduct: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const product = await ctx.prisma.product.findUnique({
        where: {
          id: input?.id
        },
        include: {
          images: true,
          categories: true,
          variants: {
            orderBy: {
              name: 'desc'
            }
          }
        }
      });
      return product;
    }),
  getActiveProducts: publicProcedure
    .query(async ({ ctx }) => {
      const products = await ctx.prisma.product.findMany({
        where: {
          isActive: true
        },
        include: {
          images: true,
          categories: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return products;
    }),
  getActiveProductsByCategory: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (input?.id === 'all') {
        return await ctx.prisma.product.findMany({
          where: {
            isActive: true
          },
          include: {
            images: true,
            categories: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      const products = await ctx.prisma.product.findMany({
        where: {
          isActive: true,
          categories: {
            some: {
              id: input?.id
            }
          }
        },
        include: {
          images: true,
          categories: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return products;
    }),
  getImages: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const images = await ctx.prisma.product.findMany({
        where: {
          id: input?.id
        },
        include: {
          images: {
            select: {
              id: true,
              src: true,
              alt: true
            }
          },
          variants: {
            select: {
              id: true,
              imageSrc: true
            }
          }
        }
      });
      return images;
    }),
  toggleStatus: publicProcedure
    .input(z.object({ id: z.string() }).nullish())
    .mutation(async ({ input, ctx }) => {
      const product = await ctx.prisma.product.findUniqueOrThrow({
        where: {
          id: input?.id,
        },
      });

      if (product.isActive) {
        await ctx.prisma.product.update({
          where: {
            id: input?.id,
          },
          data: {
            isActive: false,
          }
        });
      } else {
        await ctx.prisma.product.update({
          where: {
            id: input?.id,
          },
          data: {
            isActive: true,
          }
        });
      }

      return product;
    }
    ),
  addProduct: publicProcedure
    .input(ProductInput)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.product.create({
        data: {
          name: input?.name,
          price: parseFloat(input?.price),
          weight: parseFloat(input?.weight),
          description: input?.description,
          images: {
            createMany: {
              data: [
                ...input?.image.map((image) => ({
                  src: image.src,
                  alt: input.name,
                }))
              ]
            }
          },
          variants: {
            createMany: {
              data: [
                ...input?.variant.map((variant) => ({
                  name: variant.name,
                  imageSrc: variant.imageSrc,
                  type: "color",
                }))
              ]
            }
          }
        },
      });
    }),
  updateProduct: publicProcedure
    .input(UpdateProductInput)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.product.update({
        where: {
          id: input?.id,
        },
        data: {
          name: input?.name,
          price: parseFloat(input?.price),
          weight: parseFloat(input?.weight),
          description: input?.description,
        },
      });
    }),
  addProductImage: publicProcedure
    .input(z.object({
      productId: z.string(),
      imageSrc: z.string(),
      imageAlt: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.product.update({
        where: {
          id: input?.productId,
        },
        data: {
          images: {
            create: {
              src: input?.imageSrc,
              alt: input?.imageAlt
            }
          }
        },
        include: {
          images: {
            select: {
              id: true,
              createdAt: true,
            }
          }
        }
      });

    }),
  deleteProductImage: publicProcedure
    .input(z.object({
      productId: z.string(),
      imageId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.product.update({
        where: {
          id: input?.productId,
        },
        data: {
          images: {
            delete: {
              id: input?.imageId
            }
          }
        }
      });
    }),
  attachProductToCategory: publicProcedure
    .input(z.object({
      productId: z.string(),
      categoryId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {

      await ctx.prisma.product.update({
        where: {
          id: input?.productId,
        },
        data: {
          categories: {
            set: []
          }
        }
      });

      await ctx.prisma.product.update({
        where: {
          id: input?.productId,
        },
        data: {
          categories: {
            connect: {
              id: input?.categoryId
            }
          }
        }
      });
    }),
  removeAllCategories: publicProcedure
    .input(z.object({
      productId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.product.update({
        where: {
          id: input?.productId,
        },
        data: {
          categories: {
            set: []
          }
        }
      });
    }),
  addVariant: publicProcedure
    .input(z.object({
      variant: z.array(z.object({
        id: z.string(),
        name: z.string().min(1),
        imageSrc: z.string().min(1),
        add: z.boolean(),
        productId: z.string()
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      input?.variant.forEach(async (variant) => {
        if (variant.add) {
          await ctx.prisma.variant.create({
            data: {
              name: variant.name,
              imageSrc: variant.imageSrc,
              productId: variant.productId,
              type: "color",
            },
          });
        } else {
          await ctx.prisma.variant.update({
            where: {
              id: variant.id,
            },
            data: {
              name: variant.name,
              imageSrc: variant.imageSrc,
            },
          });
        }
      })
    }),
  removeVariant: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.variant.delete({
        where: {
          id: input?.id,
        },
      });
    }),
  setBannerText: publicProcedure
    .input(z.object({
      name: z.string(),
      value: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.settings.upsert({
        where: {
          name: input?.name,
        },
        update: {
          value: input?.value,
        },
        create: {
          name: input?.name,
          value: input?.value,
        }
      });

    }),
  getBannerText: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const bannerText = await ctx.prisma.settings.findUnique({
          where: {
            name: "banner"
          }
        });
        return bannerText;
      } catch (e) {
        console.log(e);
        return null
      }
    }),
  getCategories: publicProcedure
    .query(async ({ ctx }) => {
      const categories = await ctx.prisma.category.findMany({
        orderBy: {
          name: "asc"
        }
      });
      return categories;
    }),
  getActiveCategories: publicProcedure
    .query(async ({ ctx }) => {
      const categories = await ctx.prisma.category.findMany({
        where: {
          isActive: true
        },
        include: {
          products: {
            where: {
              isActive: true
            }
          }
        },
        orderBy: {
          name: "asc"
        }
      });
      return categories;
    }),
  storeCategory: publicProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.category.create({
        data: {
          name: input?.name,
        },
      });
    }),
  updateCategory: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.category.update({
        where: {
          id: input?.id,
        },
        data: {
          name: input?.name,
        },
      });
    }),
  toggleCategoryStatus: publicProcedure
    .input(z.object({ id: z.string() }).nullish())
    .mutation(async ({ input, ctx }) => {
      const category = await ctx.prisma.category.findUniqueOrThrow({
        where: {
          id: input?.id,
        },
      });

      if (category.isActive) {
        await ctx.prisma.category.update({
          where: {
            id: input?.id,
          },
          data: {
            isActive: false,
          }
        });
      } else {
        await ctx.prisma.category.update({
          where: {
            id: input?.id,
          },
          data: {
            isActive: true,
          }
        });
      }

      return category;
    }
    ),
  deleteCategory: publicProcedure
    .input(z.object({ id: z.string() }).nullish())
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.category.delete({
        where: {
          id: input?.id,
        },
      });
    }
    ),
  deleteProduct: publicProcedure
    .input(z.object({ id: z.string() }).nullish())
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.product.delete({
        where: {
          id: input?.id,
        },
      });
    }
    ),
});

