'use strict';

class FormValidator {
  constructor(form) {
    this.form = form;
    this.inputs = this.form.querySelectorAll('input[required]');
    this.addValidationHandlers();
  }

  addValidationHandlers() {
    for (let input of this.inputs) {
      input.addEventListener('invalid', () => {
        input.classList.add('invalid');
        input.parentNode.previousElementSibling.classList.add('invalid');
        input.nextElementSibling.classList.add('invalid');
      });
    }
  }

  resetValidation() {
    for (let input of this.inputs) {
      input.classList.remove('invalid');
      input.parentNode.previousElementSibling.classList.remove('invalid');
      input.nextElementSibling.classList.remove('invalid');
    }
  }
}

class ContactManager {
  constructor(contacts) {
    this.HTMLTemplates = this.initializeTemplates();
    this.contacts      = contacts;
    this.contactsView  = document.querySelector('#contacts-view');
    this.form          = document.querySelector('form');
    this.validator     = new FormValidator(this.form);

    this.renderContacts(contacts);
    this.initializeGUI();
  }

  initializeTemplates() {
    const HTMLTemplates = {};
    const templates = document.querySelectorAll('[type="text/x-handlebars"]');
    for (let template of templates) {
      HTMLTemplates[template.id] = Handlebars.compile(template.innerHTML);
    }
    Handlebars.registerPartial('contact', HTMLTemplates['contact-template']);
    return HTMLTemplates;
  }

  renderContacts(contacts) {
    Array.from(document.querySelectorAll('.contact')).forEach(contact => {
      contact.remove();
    });

    let contactsHTML = this.HTMLTemplates['contacts-template']({ contacts });
    this.contactsView.insertAdjacentHTML('beforeend', contactsHTML);
  
    this.showContactsView(true);
  }

  showContactsView(show) {
    let noContacts = document.querySelector('#no-contacts').classList;
    let contactsView = this.contactsView.classList;
    let createEditContact = document.querySelector('#create-edit-contact').classList;
  
    if (show) {
      createEditContact.add('hide');
      contactsView.remove('hide');
      this.contacts.length === 0 ? noContacts.remove('hide') : noContacts.add('hide');
    } else {
      contactsView.add('hide');
      createEditContact.remove('hide');
    }
  }

  initializeGUI() {
    this.addCreateHandler();
    this.addEditHandler();
    this.addFormSubmit();
    this.addFormCancel();
    this.addContactDelete();
    this.addSearchHandler();
    this.populateTagSelect();
    this.addTagFilter();
  }

  addCreateHandler() {
    this.contactsView.addEventListener('click', event => {
      if (event.target.className !== 'add-button') return;

      event.preventDefault();
      this.showContactsView(false);
    });
  }

  addEditHandler() {
    this.contactsView.addEventListener('click', event => {
      if (event.target.className !== 'edit-button') return;

      event.preventDefault();

      this.form.previousElementSibling.firstElementChild.textContent = 'Edit Contact';
      let id = event.target.parentNode.parentNode.dataset.id;
      this.populateForm(this.contacts.find(contact => contact.id === Number(id)));
      this.form.setAttribute('data-contact-id', id);

      this.showContactsView(false);
    });
  }

  addFormSubmit() {
    this.form.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      this.validator.resetValidation();
      if (event.currentTarget.checkValidity()) {
        let formFields = {};
        for (let [ key, value ] of new FormData(this.form)) {
          if (key === 'tags') {
            value = this.validateTagsFormat(value);
          }
          formFields[key] = value;
        }
        
        if (this.form.hasAttribute('data-contact-id')) {
          await this.updateExistingContact(formFields);
        } else {
          await this.createNewContact(formFields);
        }
    
        this.form.reset();
        this.populateTagSelect();
      }
    });
  }

  validateTagsFormat(tagsString) {
    return tagsString.split(',').map(tag => tag.trim()).join(', ');
  }

  async updateExistingContact(formFields) {
    let id = this.form.dataset.contactId;
    let options = {
      method: 'PUT',
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: JSON.stringify(formFields),
    };
    let response = await fetch(`http://localhost:3000/api/contacts/${id}`, options);

    if (response.status === 201) {
      let updatedContact = await response.json();

      let contactIndex;
      this.contacts.forEach((contact, idx) => {
        if (contact.id === updatedContact.id) {
          contactIndex = idx;
        }
      });
      this.contacts[contactIndex] = updatedContact;

      let contactHTML = this.HTMLTemplates['contact-template'](updatedContact);
      let contactDiv = document.querySelector(`[data-id='${id}']`);
      contactDiv.insertAdjacentHTML('beforebegin', contactHTML);
      contactDiv.remove();
    }
  }

  async createNewContact(formFields) {
    let options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: JSON.stringify(formFields),
    };
    let response = await fetch('http://localhost:3000/api/contacts', options);

    if (response.status === 201) {
      let newContact = await response.json();
      this.contacts.push(newContact);
      let contactHTML = this.HTMLTemplates['contact-template'](newContact);
      this.contactsView.insertAdjacentHTML('beforeend', contactHTML);
    }
  }

  addFormCancel() {
    this.form.addEventListener('reset', () => {
      this.form.previousElementSibling.firstElementChild.textContent = 'Create Contact';
      this.form.removeAttribute('data-contact-id');
      this.showContactsView(true);
    });
  }

  addContactDelete() {
    this.contactsView.addEventListener('click', async (event) => {
      if (event.target.className !== 'delete-button') return;

      event.preventDefault();
      let msg = 'Are you sure you want to delete the contact?';
      if (window.confirm(msg)) {
        let contactDiv = event.target.parentNode.parentNode;
        let id = contactDiv.dataset.id;
        let response = await fetch(`http://localhost:3000/api/contacts/${id}`, {method: 'DELETE'});
        if (response.status === 204) {
          this.contacts = this.contacts.filter(contact => contact.id !== Number(id));
          contactDiv.remove();
          this.showContactsView(true);
          this.populateTagSelect();
        }
      }
    });
  }

  populateForm(contact) {
    Object.keys(contact).forEach(name => {
      let input = this.form.querySelector(`[name=${name}]`);
      if (input) {
        input.value = contact[name];
      }
    });
  }

  addSearchHandler() {
    let searchBar = document.querySelector('#utility-bar input');
    searchBar.addEventListener('keyup', event => {
      let searchTerm = event.target.value;
      let hits = this.contacts.filter(contact => {
        let pattern = new RegExp(`${searchTerm}.*`, 'i');
        return pattern.test(contact['full_name']);
      });

      this.renderContacts(hits);
      this.resetTagSelect();
    });
  }

  populateTagSelect() {
    let select = document.querySelector('select');
    select.innerHTML = '';
    let option = document.createElement('option');
    option.value = 'Any tags';
    option.textContent = 'Any tags';
    select.appendChild(option);

    let tags = this.contacts.reduce((acc, contact) => {
      contact.tags.split(', ').forEach(tag => {
        if (!acc.includes(tag)) {
          acc.push(tag);
        }
      });
      return acc;
    }, []);

    tags.forEach(tag => {
      let option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      select.appendChild(option);
    });
  }

  addTagFilter() {
    let select = document.querySelector('select');
    select.addEventListener('change', () => {
      if (select.value === 'Any tags') {
        this.renderContacts(this.contacts);
      } else {
        let hits = this.contacts.filter(contact => {
          return contact.tags.split(', ').includes(select.value);
        });

        this.renderContacts(hits);
      }

      let searchBar = document.querySelector('#utility-bar input');
      searchBar.value = '';
    });
  }

  resetTagSelect() {
    let option = document.querySelector('[value="Any tags"]');
    option.selected = 'selected';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  let response = await fetch('http://localhost:3000/api/contacts', {method: 'GET'});
  let contacts = await response.json();

  new ContactManager(contacts);
});