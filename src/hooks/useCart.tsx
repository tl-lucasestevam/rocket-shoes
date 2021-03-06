import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const cartLocalStorageKey = "@RocketShoes:cart";

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(cartLocalStorageKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCardRef = useRef<Product[]>();
  const cartPreviousValue = prevCardRef.current ?? cart;

  useEffect(() => {
    prevCardRef.current = cart;
  });

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productAlreadyInCard = updatedCart.find(
        (product) => product.id === productId
      );
      const { data: productStock } = await api.get(`/stock/${productId}`);
      const amount = productAlreadyInCard ? productAlreadyInCard.amount + 1 : 1;

      if (amount > productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productAlreadyInCard) {
        productAlreadyInCard.amount = amount;
      } else {
        const { data: productData } = await api.get(`/products/${productId}`);
        const newProduct = {
          ...productData,
          amount,
        };
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
    } catch {
      toast.error("Erro na adi????o do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remo????o do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: productStock } = await api.get(`/stock/${productId}`);
      if (amount > productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const productAlreadyInCard = updatedCart.find(
        (product) => product.id === productId
      );

      if (productAlreadyInCard) {
        productAlreadyInCard.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na altera????o de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
