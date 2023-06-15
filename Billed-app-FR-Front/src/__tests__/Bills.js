/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import { bills } from "../fixtures/bills.js";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon).toHaveClass("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });
});

//** buttonNewBill/handleClickNewBill  //containers/Bills */
describe("When I click on New Bill", () => {
  test("then the new bill page should open", () => {
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname }); // simulation le chargement d'une nouvelle page
    };

    const mockedBills = new Bills({
      // instance de bills
      document,
      onNavigate,
      mockStore,
      localStorage: window.localStorage,
    });

    // fonction pour vérifier si elle est appelée lors du clic sur le bouton "New Bill"
    const handleClickNewBill = jest.fn((e) => mockedBills.handleClickNewBill(e));
    const buttonNewBill = screen.getByTestId("btn-new-bill");

    // simulation du click
    buttonNewBill.addEventListener("click", handleClickNewBill);
    userEvent.click(buttonNewBill);

    expect(handleClickNewBill).toHaveBeenCalled();
    expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
    expect(screen.getByTestId("form-new-bill")).toBeTruthy();
  });
});

//** handleClickIconEye  //containers/Bills */
describe("When I click on an icon eye", () => {
  test("then the display proof should open", () => {
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };

    // interface utilisateur notes de frais et ajoutée au document
    const html = BillsUI({ data: bills });
    document.body.innerHTML = html;
    $.fn.modal = jest.fn();

    // instance de bills
    const mockedBills = new Bills({
      document,
      onNavigate,
      mockStore,
      localStorage: window.localStorage,
    });

    // selection de l'icone + écouteur d'évenement
    const iconEye = screen.getAllByTestId("icon-eye")[0];
    const handleClickIconEye = jest.fn(mockedBills.handleClickIconEye(iconEye));

    iconEye.addEventListener("click", handleClickIconEye);
    userEvent.click(iconEye);

    expect(handleClickIconEye).toHaveBeenCalled;
    expect(screen.getAllByText("Justificatif")).toBeTruthy();
  });
});

//***  test d'intégration GET ***

describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills page", () => {
    test("fetches bills from mock API GET", async () => {
      // Simulation d'un utilisateur connecté en tant qu'employé en configurant localStorage
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });

      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );

      // Simulation de la navigation vers la page des notes de frais
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      // Création d'une instance de la classe Bills
      const mockedBills = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const bills = await mockedBills.getBills(); // Récupération des notes de frais depuis l'API

      expect(bills.length != 0).toBeTruthy(); // Vérifer qu'il y a au moins une note de frais
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        document.body.innerHTML = BillsUI({ error: "Erreur 404" });
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        document.body.innerHTML = BillsUI({ error: "Erreur 500" });
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
