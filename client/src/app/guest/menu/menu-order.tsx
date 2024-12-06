"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useDishListQuery } from "@/queries/useDish";
import { cn, formatCurrency, handleErrorApi } from "@/lib/utils";
import { useMemo, useState } from "react";
import { GuestCreateOrdersBodyType } from "@/schemaValidations/guest.schema";
import Quantity from "./quantity";
import { useGuestOrderMutation } from "@/queries/useGuest";
import { useRouter } from "next/navigation";
import { DishStatus } from "@/constants/type";

const ITEMS_PER_PAGE = 8;

export default function MenuOrder() {
  const { data } = useDishListQuery();
  const dishes = useMemo(() => data?.payload.data ?? [], [data]);
  const [orders, setOrders] = useState<GuestCreateOrdersBodyType>([]);


  const [currentPage, setCurrentPage] = useState(1);

  const { mutateAsync } = useGuestOrderMutation();
  const router = useRouter();

  const totalPrice = useMemo(() => {
    return dishes.reduce((result, dish) => {
      const order = orders.find((order) => order.dishId === dish.id);
      if (!order) return result;
      return result + order.quantity * dish.price;
    }, 0);
  }, [dishes, orders]);

  const handleQuantityChange = (dishId: number, quantity: number) => {
    setOrders((prevOrders) => {
      if (quantity === 0) {
        return prevOrders.filter((order) => order.dishId !== dishId);
      }
      const index = prevOrders.findIndex((order) => order.dishId === dishId);
      if (index === -1) {
        return [...prevOrders, { dishId, quantity }];
      }
      const newOrders = [...prevOrders];
      newOrders[index] = { ...newOrders[index], quantity };
      return newOrders;
    });
  };

  const handleOrder = async () => {
    try {
      await mutateAsync(orders);
      router.push(`/guest/orders`);
    } catch (error) {
      handleErrorApi({
        error,
      });
    }
  };


  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDishes = dishes.slice(startIndex, startIndex + ITEMS_PER_PAGE);


  const pageCount = Math.ceil(dishes.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 w-full">
        {paginatedDishes
          .filter((dish) => dish.status !== DishStatus.Hidden)
          .map((dish) => (
            <div
              key={dish.id}
              className={cn(
                "flex flex-col items-center gap-4 p-4 border rounded-lg shadow-lg hover:shadow-2xl transition-all",
                {
                  "pointer-events-none opacity-50": dish.status === DishStatus.Unavailable,
                }
              )}
            >

              <div className="relative w-[150px] h-[150px] mb-4">
                {dish.status === DishStatus.Unavailable && (
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-white bg-black bg-opacity-50 rounded-md">
                    Hết hàng
                  </span>
                )}
                <Image
                  src={dish.image}
                  alt={dish.name}
                  height={150}
                  width={150}
                  quality={100}
                  className="object-cover rounded-md w-full h-full"
                />
              </div>

              <div className="flex-1 text-center">
                <h3 className="text-sm font-semibold text-gray-800 truncate">{dish.name}</h3>
                <p className="text-xs text-gray-600 line-clamp-2 mt-2">{dish.description}</p>
                <p className="text-xs font-semibold text-green-600 mt-2">
                  {formatCurrency(dish.price)}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button 
                  onClick={() => handleQuantityChange(dish.id, Math.max(0, (orders.find((order) => order.dishId === dish.id)?.quantity ?? 0) - 1))}
                  className="bg-gray-200 px-2 py-1 rounded-md"
                >
                  -
                </button>
                <span className="text-lg font-semibold">{orders.find((order) => order.dishId === dish.id)?.quantity ?? 0}</span>
                <button 
                  onClick={() => handleQuantityChange(dish.id, (orders.find((order) => order.dishId === dish.id)?.quantity ?? 0) + 1)}
                  className="bg-gray-200 px-2 py-1 rounded-md"
                >
                  +
                </button>
              </div>
            </div>
          ))}
      </div>

      
      <div className="flex justify-center gap-2 mt-4">
        {[...Array(pageCount)].map((_, index) => (
          <Button
            key={index}
            onClick={() => handlePageChange(index + 1)}
            className={cn(
              "px-4 py-2 text-sm font-semibold border rounded-md",
              currentPage === index + 1 ? "bg-blue-500 text-white" : "bg-white text-blue-500"
            )}
          >
            {index + 1}
          </Button>
        ))}
      </div>

      
      <div className="sticky bottom-0">
        <Button
          className="w-full py-6 text-xl flex justify-center items-center gap-4 "
          onClick={handleOrder}
          disabled={orders.length === 0}
        >
          <span className="flex-1 text-center">Đặt hàng · {orders.length} món</span>
          <span>{formatCurrency(totalPrice)}</span>
        </Button>
      </div>
    </>
  );
}
