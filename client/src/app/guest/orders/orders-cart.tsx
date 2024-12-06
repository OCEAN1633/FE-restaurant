"use client";

import { useAppContext } from "@/components/app-provider";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { OrderStatus } from "@/constants/type";
import { formatCurrency, getVietnameseOrderStatus } from "@/lib/utils";
import { useGuestGetOrderListQuery } from "@/queries/useGuest";
import {
  PayGuestOrdersResType,
  UpdateOrderResType,
} from "@/schemaValidations/order.schema";
import Image from "next/image";
import { useEffect, useMemo } from "react";

export default function OrdersCart() {
  const { data, refetch } = useGuestGetOrderListQuery();
  const orders = useMemo(() => data?.payload.data ?? [], [data]);

  const { socket } = useAppContext();

  const { waitingForPaying, paid } = useMemo(() => {
    return orders.reduce(
      (result, order) => {
        if (
          order.status === OrderStatus.Delivered ||
          order.status === OrderStatus.Processing ||
          order.status === OrderStatus.Pending
        ) {
          return {
            ...result,
            waitingForPaying: {
              price:
                result.waitingForPaying.price +
                order.dishSnapshot.price * order.quantity,
              quantity: result.waitingForPaying.quantity + order.quantity,
            },
          };
        }
        if (order.status === OrderStatus.Paid) {
          return {
            ...result,
            paid: {
              price:
                result.paid.price + order.dishSnapshot.price * order.quantity,
              quantity: result.paid.quantity + order.quantity,
            },
          };
        }
        return result;
      },
      {
        waitingForPaying: {
          price: 0,
          quantity: 0,
        },
        paid: {
          price: 0,
          quantity: 0,
        },
      }
    );
  }, [orders]);

  useEffect(() => {
    if (socket?.connected) {
      onConnect();
    }

    function onConnect() {
      console.log(socket?.id);
    }

    function onDisconnect() {
      console.log("disconnect");
    }

    function onUpdateOrder(data: UpdateOrderResType["data"]) {
      const {
        dishSnapshot: { name },
        quantity,
      } = data;
      toast({
        description: `Món ${name} (SL: ${quantity}) vừa được cập nhật sang trạng thái "${getVietnameseOrderStatus(
          data.status
        )}"`,
      });
      refetch();
    }

    function onPayment(data: PayGuestOrdersResType["data"]) {
      const { guest } = data[0];
      toast({
        description: `${guest?.name} tại bàn ${guest?.tableNumber} thanh toán thành công ${data.length} đơn`,
      });
      refetch();
    }

    socket?.on("update-order", onUpdateOrder);
    socket?.on("payment", onPayment);

    socket?.on("connect", onConnect);
    socket?.on("disconnect", onDisconnect);

    return () => {
      socket?.off("connect", onConnect);
      socket?.off("disconnect", onDisconnect);
      socket?.off("update-order", onUpdateOrder);
      socket?.off("payment", onPayment);
    };
  }, [refetch, socket]);

  return (
  <>
    {orders.length === 0 && (
      <div className="text-center p-4 text-lg text-gray-600">
        Chưa có món nào trong đơn hàng. Hãy quay lại trang Menu để chọn món.
      </div>
    )}
    
    <div className="space-y-4">
      {orders.map((order, index) => (
        <div key={order.id} className="flex gap-6 bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-all">
          
          <div className="text-lg font-semibold text-gray-700 w-[20px]">{index + 1}</div>

          
          <div className="flex-shrink-0 relative w-[90px] h-[90px]">
            <Image
              src={order.dishSnapshot.image}
              alt={order.dishSnapshot.name}
              height={90}
              width={90}
              quality={100}
              className="object-cover rounded-md"
            />
          </div>

          
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">{order.dishSnapshot.name}</h3>
            <div className="text-xs text-gray-600">
              {formatCurrency(order.dishSnapshot.price)} x{" "}
              <Badge className="bg-gray-200 px-1 py-0.5">{order.quantity}</Badge>
            </div>
          </div>

          
          <div className="flex-shrink-0 ml-auto flex justify-center items-center">
            <Badge variant="outline" className="px-2 py-1 text-sm">
              {getVietnameseOrderStatus(order.status)}
            </Badge>
          </div>
        </div>
      ))}
    </div>

    
    {paid.quantity !== 0 && (
      <div className="sticky bottom-0 bg-green-600 text-white p-6">
        <div className="w-full flex justify-between items-center text-xl font-semibold">
          <span>Đơn đã thanh toán · {paid.quantity} món</span>
          <span>{formatCurrency(paid.price)}</span>
        </div>
      </div>
    )}

    
    {waitingForPaying.quantity !== 0 && (
      <div className="sticky bottom-0 bg-yellow-500 text-white p-6">
        <div className="w-full flex justify-between items-center text-xl font-semibold">
          <span>Đơn chưa thanh toán · {waitingForPaying.quantity} món</span>
          <span>{formatCurrency(waitingForPaying.price)}</span>
        </div>
      </div>
    )}
  </>
);

}
